import { generateRequirements, generateRoadmap, generateCurriculum, analyzeDocumentWithGemini } from '../geminiBackendService.js';
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { GoogleGenAI } from "@google/genai";
import { retrieveContext, getFullMaterialText, getMaterialDetails } from '../ragService.js';
import path from 'path';

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const getGenAI = () => new GoogleGenAI(getApiKey());
const PROJECT_ROOT = process.cwd();

// --- Node Functions ---

/**
 * Orchestrator (Supervisor) Node: 
 * Decides which specialized agent should act next and VALIDATES outputs.
 * Following the paper's Figure 1 where the Supervisor directs and verifies.
 */
async function orchestratorNode(state) {
    console.log("--- Node: Orchestrator (Supervisor) ---");
    const { requirements, roadmap, curriculum, current_decision, attachments, analysis, review } = state;

    // 1. Process incoming user decision first
    if (current_decision) {
        return { next_actor: "approval" };
    }

    // 2. Initial Document Analysis (Priority)
    if (attachments?.length > 0 && !analysis) {
        console.log("   [ROUTING] Target: Analyzer (New files detected)");
        return { next_actor: "analyzer" };
    }

    // 3. Specialized Agent Routing & Verification Loop

    // Step A: Gathering Requirements
    if (!requirements?.approved) {
        console.log("   [ROUTING] Target: Interviewer Agent");
        return { next_actor: "interviewer" };
    }

    // Step B: Designing Roadmap
    if (!roadmap?.approved) {
        console.log("   [ROUTING] Target: Architect Agent");
        return { next_actor: "architect" };
    }

    // Step C: Writing Content & Internal Review Loop
    if (!curriculum?.approved) {
        // If content is drafted but not yet reviewed
        if (curriculum.draft && !review) {
            console.log("   [ROUTING] Target: Reviewer Agent (Validating output)");
            return { next_actor: "reviewer" };
        }

        // If review found issues (Self-Correction Loop)
        if (review?.status === 'rejected') {
            console.log("   [ROUTING] Target: Writer Agent (Redrafting based on feedback)");
            return { next_actor: "writer" };
        }

        // Otherwise, move to Writer to get initial draft
        console.log("   [ROUTING] Target: Writer Agent");
        return { next_actor: "writer" };
    }

    console.log("   [ROUTING] Target: END (Quality Assurance passed)");
    return { next_actor: "end" };
}

/**
 * Agent 4: Reviewer (Quality Assurance)
 * Focus: Verifying consistency, educational quality, and JSON structure validity.
 */
async function reviewerNode(state) {
    console.log("--- Node: Reviewer Agent ---");
    const { analysis, requirements, curriculum } = state;

    // Skip review if no draft exists
    if (!curriculum?.draft) {
        return { next_actor: "orchestrator" };
    }

    const genAI = getGenAI();
    const prompt = `
        You are an Expert Curriculum Reviewer for the Lumina Learning Platform.
        Your job is to strictly validate the generated curriculum against Quality Standards.

        【Reference Analysis】
        ${analysis || "None"}

        【Requirements】
        ${JSON.stringify(requirements.approved)}

        【Curriculum Draft (Partial View)】
        Title: ${curriculum.draft.title.en}
        Module Count: ${curriculum.draft.modules?.length}
        First Module: ${JSON.stringify(curriculum.draft.modules?.[0], null, 2)}

        【CHECKLIST】
        
        1. **Content Richness**: 
           - Does the content look "thin" or "full"? 
           - Are there clear explanations, examples, and diagrams?
           
        2. **Technical Validity (CRITICAL)**:
           - Do 'callout' blocks have BOTH 'title' and 'text'? (Reject if missing)
           - Do 'list' blocks have 'items'?
           - Are texts properly bilingual (en/jp)?
           - Is there a mix of block types (text, mermaid, code, callout)?

        3. **Alignment**: 
           - Does it match the difficulty defined in requirements?
           - Does it cover the analyzed material?

        Response Format:
        STATUS: [PASS or REJECT]
        FEEDBACK: [Detailed feedback for the Writer if REJECTed, or approval remarks if PASS]
        
        If REJECTED, be very specific about what needs to be fixed (e.g., "Module 1 Lesson 2 callouts are empty").
    `;

    try {
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const response = result.text || "";
        // Simple heuristic parsing
        const status = response.includes("STATUS: PASS") ? "passed" : "rejected";
        console.log(`   [REVIEWER] Status: ${status.toUpperCase()}`);

        return {
            review: { status, feedback: response },
            // If rejected, loop back to writer (handled by orchestrator logic ideally, 
            // but for now we pass feedback to next iteration)
            next_actor: "orchestrator"
        };
    } catch (e) {
        console.error("   [REVIEWER] Error:", e);
        return { next_actor: "orchestrator" }; // Fail safe
    }
}

/**
 * Approval Node: Processes 'approved' or 'revise' decisions.
 */
async function approvalNode(state) {
    console.log("--- Node: Approval Processor ---");
    const { current_decision, requirements, roadmap, curriculum } = state;
    const { stage, decision, feedback } = current_decision;

    const updates = {
        current_decision: null,
        pending_approval: "none"
    };

    if (decision === 'approved') {
        console.log(`   [ACTION] Approved: ${stage}`);
        if (stage === 'requirements') updates.requirements = { ...requirements, approved: requirements.draft };
        else if (stage === 'roadmap') updates.roadmap = { ...roadmap, approved: roadmap.draft };
        else if (stage === 'curriculum') updates.curriculum = { ...curriculum, approved: curriculum.draft };
    } else if (decision === 'revise') {
        console.log(`   [ACTION] Revision requested: ${stage} (${feedback})`);
        // Reset draft to trigger re-generation by the specialized agent
        if (stage === 'requirements') updates.requirements = { ...requirements, draft: null };
        else if (stage === 'roadmap') updates.roadmap = { ...roadmap, draft: null };
        else if (stage === 'curriculum') updates.curriculum = { ...curriculum, draft: null };
    }

    return updates;
}

/**
 * Agent 0: Analyzer (Internal Processing)
 * Focus: Summarizing attached materials into the shared state.
 */
async function analyzerNode(state) {
    console.log("--- Node: Analyzer Agent ---");
    const { attachments, user_id } = state;

    // Retrieve full text for all attachments to leverage Gemini's large context window
    console.log(`   [ANALYZER] Extracting full text for ${attachments.length} files...`);

    let fullText = "";
    for (const attachment of attachments) {
        // Handle both material_id and id based on payload structure
        const mid = attachment.material_id || attachment.id;
        if (mid) {
            let text = await getFullMaterialText(mid);

            // Fallback: If text is empty (e.g. image-only PDF), try Gemini Vision
            if (!text || text.trim().length < 50) {
                console.log(`   [ANALYZER] Text extraction weak for ${mid}, attempting Gemini Vision analysis...`);
                const details = await getMaterialDetails(mid);
                if (details && details.storage_path) {
                    const absolutePath = path.resolve(PROJECT_ROOT, details.storage_path);
                    const visionSummary = await analyzeDocumentWithGemini(absolutePath, details.type || 'application/pdf');
                    text = `[Visual Analysis]\n${visionSummary}`;
                }
            }

            fullText += `\n\n--- Document: ${attachment.name || mid} ---\n${text}`;
        }
    }

    if (!fullText.trim()) {
        console.log("   [ANALYZER] No text content found in attachments.");
        return { analysis: "資料の読み取りに失敗しました。", next_actor: "orchestrator" };
    }

    const genAI = getGenAI();
    const prompt = `
        あなたは高度な資料分析エキスパートです。
        提供された資料全文を読み込み、カリキュラム作成に必要な情報を構造化して日本語で要約してください。

        【要約に含めるべき内容】
        1. 資料の全体テーマと目的
        2. 主要な章立てやトピックの構成
        3. ターゲットとしている読者や学習者のレベル
        4. カリキュラムに必ず盛り込むべき重要なキーワードや技術概念
        5. 資料から読み取れる学習目標

        【分析対象資料】
        ${fullText}
    `;

    const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const summary = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || "分析結果の生成に失敗しました。";
    console.log("   [ANALYZER] Analysis complete. Comprehensive summary generated.");

    return {
        analysis: summary,
        next_actor: "orchestrator"
    };
}

/**
 * Agent 1: Interviewer (Requirements Gathering)
 */
async function interviewerNode(state) {
    console.log("--- Node: Interviewer Agent ---");
    const { messages, user_id, attachments, requirements, analysis } = state;

    const lastMessage = messages[messages.length - 1];

    const history = messages.map(m => {
        let role = 'AI';
        const type = m._getType?.() || m.type;
        if (type === 'human' || m.role === 'user') role = 'User';
        if (type === 'tool') role = 'User (Response)';
        return `${role}: ${m.content || m.text}`;
    }).join("\n");

    const lastContent = (lastMessage?.content || lastMessage?.text || "").toLowerCase();
    const isAffirmative = /はい|yes|お願いします|進めて|作成して|ok|了解/.test(lastContent);

    const genAI = getGenAI();

    // 1. Check if we should move to Architect
    const decisionPrompt = `
        あなたは学習要件を定義するエキスパートコンシェルジュです。
        履歴と資料の分析結果を見て、カリキュラム作成のドラフトに進む準備ができているか判断してください。

        【会話履歴】
        ${history}

        【資料の分析結果】
        ${analysis || "資料なし"}

        判断基準:
        - ユーザーが資料に基づく作成に同意している、またはトピック・目標・レベルが概ね分かっているなら READY。
        - まだヒアリングが必要なら CONTINUE。

        返答は READY または CONTINUE の一言のみにしてください。
    `;

    const decisionResult = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: decisionPrompt }] }]
    });
    const decision = (decisionResult.text || "").trim().toUpperCase();
    console.log(`   [INTERVIEWER] Decision: ${decision}`);

    if (decision.includes("READY") || (analysis && isAffirmative)) {
        console.log("   [ACTION] Generating Requirements Draft...");
        try {
            const draftInput = `${history}\n\n[Reference Analysis]\n${analysis}`;
            const draft = await generateRequirements(draftInput, attachments, user_id);

            const summaryText = `お待たせしました！資料の内容を分析し、ご要望に基づいた学習要件（Requirements）を作成しました。

**【学習要件案】**
**タイトル:** ${draft.summary}
**ゴール:** ${draft.goal}
**レベル:** ${draft.level}
**ターゲット:** ${draft.target_audience}

こちらでよろしいでしょうか？`;

            return {
                requirements: { ...requirements, draft },
                pending_approval: "requirements",
                messages: [new AIMessage({ content: summaryText })],
                next_actor: "end"
            };
        } catch (error) {
            console.error("Requirements generation failed:", error);
            return {
                messages: [new AIMessage({ content: "学習要件の生成中にエラーが発生しました。もう一度指示を出していただけますか？" })],
                next_actor: "end"
            };
        }
    }

    // 2. Continue Interview
    console.log("   [ACTION] Continuing Interview...");
    const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{
            role: "user", parts: [{
                text: `
            あなたはLuminaコンシェルジュです。資料の分析結果を踏まえ、
            ユーザーに最適なカリキュラムを提案するためのステップ（目標の深掘り等）を進めてください。
            
            【資料の分析結果】
            ${analysis || "なし"}

            重要：
            - 資料がある場合は「資料の内容（トピック名など）を拝見しました」と具体的に触れてください。
            - ユーザーに資料の内容を尋ねるのではなく、こちらから「〜についての資料ですね」と提示してください。
            
            履歴: ${history}
        ` }]
        }]
    });

    const aiResponse = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || "どのようなことを学びたいか、詳しく教えてください。";

    return {
        messages: [new AIMessage({
            content: "思考中...",
            tool_calls: [{ id: `call_${Date.now()}`, name: "ask_human", args: { question: aiResponse } }]
        })],
        next_actor: "end"
    };
}

// ...

async function architectNode(state) {
    console.log("--- Node: Architect Agent ---");
    const { requirements, roadmap, analysis } = state;

    if (!roadmap?.draft) {
        console.log("   [ACTION] Designing Roadmap draft...");
        try {
            const contextRequirements = {
                ...requirements.approved,
                materials_analysis: analysis
            };
            const draft = await generateRoadmap(contextRequirements);

            const modulesList = draft.modules.map(m => `**Module ${m.order}: ${m.title}**\n${m.objective} (${m.estimated_hours}h)`).join('\n\n');
            const summaryText = `要件に基づき、ロードマップ（章立て）案を作成しました。
            
**【ロードマップ案】**
**全体構成:** ${draft.title} (約${draft.total_hours}時間)

${modulesList}

こちらの構成で進めてよろしいでしょうか？`;

            return {
                roadmap: { ...roadmap, draft },
                pending_approval: "roadmap",
                messages: [new AIMessage({ content: summaryText })],
                next_actor: "end"
            };
        } catch (error) {
            console.error("Roadmap generation failed:", error);
            return {
                messages: [new AIMessage({ content: "ロードマップの生成中にエラーが発生しました。時間をおいて再試行するか、要件を少し変更してみてください。" })],
                next_actor: "end"
            };
        }
    }
    return { next_actor: "end" };
}

async function writerNode(state) {
    console.log("--- Node: Writer Agent ---");
    const { requirements, roadmap, curriculum, user_id, curriculum_id, curriculum_version_id, analysis } = state;

    if (!curriculum?.draft) {
        console.log("   [ACTION] Writing full curriculum details...");
        try {
            const contextRequirements = {
                ...requirements.approved,
                materials_analysis: analysis
            };
            const draft = await generateCurriculum(contextRequirements, roadmap.approved, {
                curriculumId: curriculum_id,
                version: curriculum_version_id
            }, user_id);

            const summaryText = `ロードマップに従い、全レッスンの詳細を執筆しました！
            
**【カリキュラム完成版】**
**タイトル:** ${draft.title.jp || draft.title.en}
**レッスン数:** ${draft.modules.reduce((acc, m) => acc + m.lessons.length, 0)}

最終確認をお願いします。承認すると学習を開始できます。`;

            return {
                curriculum: { ...curriculum, draft },
                pending_approval: "curriculum",
                messages: [new AIMessage({ content: summaryText })],
                next_actor: "end"
            };
        } catch (error) {
            console.error("Curriculum generation failed - FULL ERROR:", error);
            let errorMessage = "カリキュラム詳細の生成中にエラーが発生しました。";

            // Check for specific error types
            if (error.message.includes("400") || error.message.includes("InvalidArgument")) {
                errorMessage += "（入力データまたはプロンプトが長すぎる、あるいは不正な形式の可能性があります）";
            } else if (error.message.includes("500")) {
                errorMessage += "（サーバー内部エラーが発生しました）";
            }

            errorMessage += `\n\n詳細なエラー: ${error.message}`;

            return {
                messages: [new AIMessage({ content: errorMessage })],
                next_actor: "end"
            };
        }
    }
    return { next_actor: "end" };
}

export {
    orchestratorNode,
    interviewerNode,
    architectNode,
    writerNode,
    analyzerNode,
    reviewerNode,
    approvalNode
};
