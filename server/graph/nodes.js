import { generateRequirements, generateRoadmap, generateCurriculum } from '../geminiBackendService.js';
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const getGenAI = () => new GoogleGenAI(getApiKey());

// --- Node Functions ---

/**
 * Orchestrator Node: Decides the next step.
 */
async function orchestratorNode(state) {
    console.log("--- Node: Orchestrator ---");
    const { requirements, roadmap, curriculum, current_decision } = state;

    // 1. If there's an incoming decision from the user, process it first
    if (current_decision) {
        return { next_actor: "approval" };
    }

    // 2. If requirements are not yet approved, we stay in the interviewer/gathering loop
    if (!requirements?.approved) {
        return { next_actor: "interviewer" };
    }

    // 3. If requirements are approved, but roadmap is not yet approved, send to architect
    if (!roadmap?.approved) {
        return { next_actor: "architect" };
    }

    // 4. If roadmap is approved but curriculum is not yet approved, send to architect
    if (!curriculum?.approved) {
        return { next_actor: "architect" };
    }

    return { next_actor: "end" };
}

/**
 * Approval Node: Processes 'approved' or 'revise' decisions.
 */
async function approvalNode(state) {
    console.log("--- Node: Approval Processor ---");
    const { current_decision, requirements, roadmap, curriculum } = state;
    const { stage, decision, feedback } = current_decision;

    const updates = { 
        current_decision: null, // Clear the decision after processing
        pending_approval: "none" 
    };

    if (decision === 'approved') {
        console.log(`   Action: Approving ${stage}`);
        if (stage === 'requirements') {
            updates.requirements = { ...requirements, approved: requirements.draft };
        } else if (stage === 'roadmap') {
            updates.roadmap = { ...roadmap, approved: roadmap.draft };
        } else if (stage === 'curriculum') {
            updates.curriculum = { ...curriculum, approved: curriculum.draft };
        }
    } else if (decision === 'revise') {
        console.log(`   Action: Requesting revision for ${stage}`);
        // Logic for revision: clear the draft or mark for update
        // The feedback is already in the message history via the controller
    }

    return updates;
}

async function interviewerNode(state) {
    console.log("--- Node: Interviewer (AI Powered) ---");
    const { messages, user_id, attachments, requirements } = state;
    
    const lastMessage = messages[messages.length - 1];
    const hasAttachments = attachments && attachments.length > 0;

    // 1. Handle Tool Result (User Answer to a previous question)
    if (lastMessage instanceof ToolMessage || (lastMessage && lastMessage.tool_call_id)) {
        console.log("   Received user response via tool result. Analyzing...");
        try {
            const history = messages.map(m => m.content || m.text).join("\n");
            const draft = await generateRequirements(history, attachments, user_id);
            return {
                requirements: { ...requirements, draft },
                pending_approval: "requirements",
                messages: [new AIMessage({ content: "対話と資料を元に、学習要件（Requirements）のドラフトを作成しました。こちらの内容で進めてよろしいでしょうか？修正が必要な場合は教えてください。" })],
                next_actor: "end"
            };
        } catch (e) {
            console.error("Draft generation failed", e);
        }
    }

    // 2. Use Gemini to generate the next response
    const genAI = getGenAI();
    const prompt = `
        あなたは「Lumina 学習コンシェルジュ」です。日本語で答えてください。
        ユーザーと対話し、最高の学習カリキュラムを作るための要件（トピック、レベル、目標）をヒアリングしてください。

        【現在の状況】
        - 添付資料の有無: ${hasAttachments ? "あり" : "なし"}
        - 会話履歴:
        ${messages.map(m => `${m.constructor.name}: ${m.content || m.text}`).join("\n")}

        【振る舞い】
        - 資料がある場合は、まずその内容に触れ、それに基づいたカリキュラム作成を提案してください。
        - 既に十分な情報がある、またはユーザーが「作成して」と言った場合は、確認のメッセージを送ってください。

        出力は、ユーザーへの「問いかけ」または「返答」だけにしてください。
    `;

    const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    
    const aiResponse = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || "今日はどのようなことを学びたいですか？";

    return {
        messages: [new AIMessage({
            content: "思考中...", 
            tool_calls: [{
                id: `call_${Date.now()}`,
                name: "ask_human",
                args: { question: aiResponse }
            }]
        })],
        next_actor: "end"
    };
}

async function architectNode(state) {
    console.log("--- Node: Architect ---");
    const { requirements, roadmap, user_id, curriculum_id, curriculum_version_id, curriculum } = state;

    if (!roadmap?.approved && !roadmap?.draft) {
        console.log("   Generating Roadmap draft...");
        const draft = await generateRoadmap(requirements.approved);
        return {
            roadmap: { ...roadmap, draft },
            pending_approval: "roadmap",
            messages: [new AIMessage({ content: "要件の承認ありがとうございます。これに基づいたロードマップ（章立て）の構成案を作成しました。こちらでよろしいでしょうか？" })],
            next_actor: "end"
        };
    }

    if (roadmap?.approved && !curriculum?.draft) {
        console.log("   Generating Curriculum content...");
        const draft = await generateCurriculum(requirements.approved, roadmap.approved, {
            curriculumId: curriculum_id,
            version: curriculum_version_id
        }, user_id);
        return {
            curriculum: { ...curriculum, draft },
            pending_approval: "curriculum",
            messages: [new AIMessage({ content: "ロードマップの承認ありがとうございます。全てのレッスンの詳細コンテンツを生成しました！内容に問題がなければ、承認して学習を開始しましょう。" })],
            next_actor: "end"
        };
    }

    return { next_actor: "end" };
}

export {
    orchestratorNode,
    interviewerNode,
    architectNode,
    approvalNode
};
