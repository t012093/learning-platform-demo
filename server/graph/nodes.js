import { generateRequirements, generateRoadmap, generateCurriculum } from '../geminiBackendService.js';
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

// --- Helpers ---

const parseToolCall = (message) => {
    if (message.tool_calls && message.tool_calls.length > 0) {
        return message.tool_calls[0];
    }
    return null;
};

// --- Nodes ---

/**
 * Orchestrator Node: Decides who should act next based on the state.
 */
export const orchestratorNode = async (state) => {
    console.log("--- Node: Orchestrator ---");
    const { requirements, roadmap, messages } = state;

    // 1. If requirements are not yet gathered/defined, send to interviewer
    if (!requirements?.approved) {
        return { next_actor: "interviewer" };
    }

    // 2. If requirements are approved but roadmap is missing, send to architect
    if (!roadmap?.approved) {
        return { next_actor: "architect" };
    }

    // 3. If everything is approved, we are done
    return { next_actor: "end" };
};

/**
 * Interviewer Node: Talks to the user to define requirements.
 * Uses 'ask_human' tool to pause and get input.
 */
export const interviewerNode = async (state) => {
    console.log("--- Node: Interviewer ---");
    const { messages, user_id, attachments } = state;
    
    const lastMessage = messages[messages.length - 1];
    const history = messages.map(m => m.content).join("\n");
    const hasAttachments = attachments && attachments.length > 0;

    // 1. Handle Tool Result (User Answer)
    if (lastMessage instanceof ToolMessage && lastMessage.name === "ask_human") {
        console.log("   Received user response via tool result.");
        
        // Try to generate a requirements draft
        try {
            const draft = await generateRequirements(history, attachments, user_id);
            return {
                requirements: { draft, approved: null },
                pending_approval: "requirements",
                active_agent: "interviewer",
                messages: [new AIMessage({ content: "学習要件（Requirements）のドラフトを作成しました。こちらでよろしいでしょうか？内容の修正も可能です。" })],
                next_actor: "end"
            };
        } catch (e) {
            // Fallback to asking more if generation fails
        }
    }

    // 2. Initial Greeting / Context Analysis
    // If this is the very first interaction or just a greeting
    const isGreeting = history.length < 50 && /hello|hi|こんにちは|始めまして/.test(history.toLowerCase());
    
    let question = "今日はどのようなトピックについて学びたいですか？具体的な目標や、今のレベル（初心者、中級者など）を教えてください。また、資料があればアップロードしていただくことも可能です。";
    let toolCallContent = "学習者の目標を確認しています。";

    if (hasAttachments) {
        // If file attached but no clear instruction, ask for confirmation
        question = "資料を受け取りました！この資料の内容に基づいてカリキュラムを作成しますか？それとも、何か特定の目標や重点を置きたいポイントはありますか？";
        toolCallContent = "資料を受領し、次のステップを確認しています。";
    } else if (isGreeting) {
        question = "こんにちは！AIコンシェルジュです。今日はどんなスキルをマスターしたいですか？（例：Python、デザイン、歴史など）";
        toolCallContent = "ユーザーに挨拶し、トピックを尋ねています。";
    } else if (messages.length > 1) {
        // If we have some history but not enough for a draft (heuristic), ask for level/goal
        question = "ありがとうございます。よりあなたに最適なプランを作るために、今の知識レベルや、このコースを終えた後に何ができるようになりたいか、もう少し詳しく教えていただけますか？";
        toolCallContent = "詳細なスキルレベルと目標を深掘りしています。";
    }
    
    // Create a virtual tool call to 'ask_human'
    const toolCallId = `call_${Date.now()}`;
    const aiMessage = new AIMessage({
        content: toolCallContent, // Internal thought or short summary
        tool_calls: [{
            id: toolCallId,
            name: "ask_human",
            args: { question }
        }]
    });

    return {
        messages: [aiMessage],
        active_agent: "interviewer",
        pending_approval: "none",
        next_actor: "end" // Stop for human input
    };
};

/**
 * Architect Node: Designs the Roadmap and Curriculum.
 */
export const architectNode = async (state) => {
    console.log("--- Node: Architect ---");
    const { requirements, roadmap, user_id, curriculum_id, curriculum_version_id } = state;

    if (!roadmap?.draft) {
        console.log("   Generating Roadmap draft...");
        const draft = await generateRoadmap(requirements.approved);
        return {
            roadmap: { draft, approved: null },
            pending_approval: "roadmap",
            active_agent: "architect",
            messages: [new AIMessage({ content: "承認ありがとうございます！この要件に基づいてロードマップ（章立て）を作成しました。構成を確認してください。" })],
            next_actor: "end"
        };
    }

    if (roadmap.approved && !state.curriculum?.draft) {
        console.log("   Generating Curriculum content...");
        const draft = await generateCurriculum(requirements.approved, roadmap.approved, {
            curriculumId: curriculum_id,
            version: curriculum_version_id
        }, user_id);
        return {
            curriculum: { draft, approved: null },
            pending_approval: "curriculum",
            active_agent: "architect",
            messages: [new AIMessage({ content: "ロードマップの承認ありがとうございます。全てのレッスンの詳細コンテンツを生成しました！最終確認をお願いします。" })],
            next_actor: "end"
        };
    }

    return { next_actor: "end" };
};