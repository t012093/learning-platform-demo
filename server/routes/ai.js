import express from 'express';
import { createCurriculumGraph } from '../graph/workflow.js';
import { HumanMessage, ToolMessage, AIMessage } from "@langchain/core/messages";
import { getPool, ensurePhase1User, PHASE1_USER_ID } from '../db.js';

const router = express.Router();
const curriculumGraph = createCurriculumGraph();

// Helper to sanitize state from DB
const normalizeStateJson = (state) => {
    if (!state || typeof state !== 'object') return {};
    return state;
};

// Helper for UI response
const buildApprovalUi = (pendingApproval) => {
    if (!pendingApproval || pendingApproval === 'none') return null;
    return { type: 'approval', options: ['approved', 'revise'] };
};

// Helper to convert plain JSON objects from DB to LangChain Message instances
const deserializeMessages = (messages) => {
    if (!Array.isArray(messages)) return [];
    return messages.map(m => {
        if (m.type === 'human' || m._getType?.() === 'human' || m.role === 'user') {
            return new HumanMessage(m.content || m.text || "");
        }
        if (m.type === 'tool' || m._getType?.() === 'tool' || m.tool_call_id) {
            return new ToolMessage({
                content: m.content || m.text || "",
                tool_call_id: m.tool_call_id,
                name: m.name
            });
        }
        // Default to AI Message
        return new AIMessage({
            content: m.content || m.text || "",
            tool_calls: m.tool_calls
        });
    });
};

const getDisplayMessage = (outputState, nextPending) => {
    const messages = outputState.messages || [];
    if (messages.length === 0) return "こんにちは！どのようにお手伝いしましょうか？";
    
    const lastMsg = messages[messages.length - 1];
    
    // 1. If it's a tool call, the AI is asking a question via 'ask_human'
    const toolCalls = lastMsg.tool_calls || [];
    if (toolCalls.length > 0) {
        const tc = toolCalls[0];
        if (tc.name === 'ask_human' && tc.args?.question) {
            return tc.args.question;
        }
    }

    // 2. If it's a normal AI message with content
    if (lastMsg.content && lastMsg.content !== "思考中...") {
        return lastMsg.content;
    }

    // 3. Fallback to state-based technical summary if content is empty
    if (nextPending === 'requirements') return "学習要件（Requirements）の案がまとまりました。内容を確認してください。";
    if (nextPending === 'roadmap') return "ロードマップ（Roadmap）の構成案が作成されました。こちらで進めてよろしいでしょうか？";
    if (nextPending === 'curriculum') return "カリキュラムの詳細生成が完了しました！最終確認をお願いします。";
    
    return "セッションが継続中です。";
};

// POST /api/v2/ai/chat
router.post('/chat', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not configured' });

    const message = req.body.message?.trim() || '';
    const sessionId = req.body.session_id?.trim() || '';
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];

    try {
        await ensurePhase1User(pool);

        let session = null;
        if (sessionId) {
            const result = await pool.query(
                'select * from ai_sessions where id = $1 and user_id = $2',
                [sessionId, PHASE1_USER_ID]
            );
            session = result.rows[0] || null;
        }

        // Initialize Session
        if (!session) {
            const currRes = await pool.query(
                'insert into curricula (user_id, title, description) values ($1, $2, $3) returning id',
                [PHASE1_USER_ID, 'New Curriculum', '']
            );
            const currId = currRes.rows[0].id;
            const verRes = await pool.query(
                'insert into curriculum_versions (curriculum_id, version, requirements, content_json) values ($1, 1, $2, $3) returning id',
                [currId, '{}', '{}']
            );
            const verId = verRes.rows[0].id;
            
            const initialState = {
                user_id: PHASE1_USER_ID,
                curriculum_id: currId,
                curriculum_version_id: verId,
                requirements: {}, roadmap: {}, curriculum: {},
                pending_approval: 'none',
                last_user_message: message,
                attachments: attachments,
                messages: []
            };

            const sessRes = await pool.query(
                'insert into ai_sessions (user_id, curriculum_id, state_json, pending_approval, last_message_at) values ($1, $2, $3, $4, now()) returning *',
                [PHASE1_USER_ID, currId, JSON.stringify(initialState), 'none']
            );
            session = sessRes.rows[0];
        }

        // Prepare Graph Input
        const currentState = normalizeStateJson(session.state_json);
        const history = deserializeMessages(currentState.messages);
        const lastMsg = history[history.length - 1];

        let newMessages = [];
        if (lastMsg?.tool_calls?.some(tc => tc.name === 'ask_human')) {
            newMessages.push(new ToolMessage({
                tool_call_id: lastMsg.tool_calls[0].id,
                content: message,
                name: 'ask_human'
            }));
        } else {
            newMessages.push(new HumanMessage(message));
        }

        const inputState = {
            ...currentState,
            messages: newMessages,
            last_user_message: message,
            attachments: attachments.length > 0 ? attachments : currentState.attachments,
            current_decision: null
        };

        // Invoke Graph
        const outputState = await curriculumGraph.invoke(inputState);
        const nextPending = outputState.pending_approval || 'none';

        // Update DB
        await pool.query(
            'update ai_sessions set state_json = $1, pending_approval = $2, state_version = state_version + 1, last_message_at = now() where id = $3',
            [JSON.stringify(outputState), nextPending, session.id]
        );

        // Sync logic (simplified for clarity)
        if (outputState.curriculum_version_id) {
            const updates = [];
            const values = [];
            let idx = 1;
            if (outputState.requirements?.approved) {
                updates.push(`requirements = $${idx++}`);
                values.push(JSON.stringify(outputState.requirements.approved));
            }
            if (outputState.roadmap?.approved) {
                updates.push(`roadmap = $${idx++}`);
                values.push(JSON.stringify(outputState.roadmap.approved));
            }
            if (outputState.curriculum?.approved) {
                updates.push(`content_json = $${idx++}`);
                values.push(JSON.stringify(outputState.curriculum.approved));
            }
            if (updates.length > 0) {
                values.push(outputState.curriculum_version_id);
                await pool.query(`update curriculum_versions set ${updates.join(', ')}, updated_at = now() where id = $${idx}`, values);
            }
        }

        res.json({
            session_id: session.id,
            curriculum_id: outputState.curriculum_id || session.curriculum_id,
            curriculum_version_id: outputState.curriculum_version_id,
            message: getDisplayMessage(outputState, nextPending),
            pending_approval: nextPending,
            ui: buildApprovalUi(nextPending),
            state_summary: {
                requirements: outputState.requirements || {},
                roadmap: outputState.roadmap || {},
                curriculum: outputState.curriculum || {}
            }
        });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ error: 'Failed to process chat' });
    }
});

// POST /api/v2/curricula/:id/decision
router.post('/curricula/:id/decision', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not configured' });

    const { stage, decision, feedback_text, session_id } = req.body;
    
    try {
        await ensurePhase1User(pool);
        
        const result = await pool.query(
            'select * from ai_sessions where id = $1 and user_id = $2',
            [session_id, PHASE1_USER_ID]
        );
        if (!result.rowCount) return res.status(404).json({ error: 'Session not found' });
        const session = result.rows[0];

        const currentState = normalizeStateJson(session.state_json);
        const inputState = {
            ...currentState,
            current_decision: { stage, decision, feedback: feedback_text },
            messages: [new HumanMessage(`Decision: ${decision} for ${stage}`)]
        };

        const outputState = await curriculumGraph.invoke(inputState);
        const nextPending = outputState.pending_approval || 'none';
        const status = (stage === 'curriculum' && decision === 'approved') ? 'closed' : session.status;

        await pool.query(
            'update ai_sessions set state_json = $1, pending_approval = $2, state_version = state_version + 1, status = $3, last_message_at = now() where id = $4',
            [JSON.stringify(outputState), nextPending, status, session.id]
        );

        // ... Sync logic (abbreviated, same as chat) ...
        
        res.json({
            ok: true,
            status: status === 'closed' ? 'approved' : 'draft',
            pending_approval: nextPending,
            state_summary: {
                requirements: outputState.requirements || {},
                roadmap: outputState.roadmap || {},
                curriculum: outputState.curriculum || {}
            }
        });

    } catch (error) {
        console.error('Decision Error:', error);
        res.status(500).json({ error: 'Failed to process decision' });
    }
});

export default router;
