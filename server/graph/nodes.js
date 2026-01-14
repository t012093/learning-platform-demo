import { generateRequirements, generateRoadmap, generateCurriculum } from '../geminiBackendService.js';

// --- Nodes ---

export const generateRequirementsNode = async (state) => {
    const message = state.last_user_message || "";
    const attachments = state.attachments || [];
    const userId = state.user_id;

    console.log("--- Node: Generate Requirements ---");
    const draft = await generateRequirements(message, attachments, userId);
    
    return {
        requirements: { draft, approved: null },
        pending_approval: "requirements"
    };
};

export const generateRoadmapNode = async (state) => {
    console.log("--- Node: Generate Roadmap ---");
    const requirements = state.requirements.approved;
    if (!requirements) {
        throw new Error("Cannot generate roadmap without approved requirements");
    }

    const draft = await generateRoadmap(requirements);
    
    return {
        roadmap: { draft, approved: null },
        pending_approval: "roadmap"
    };
};

export const generateCurriculumNode = async (state) => {
    console.log("--- Node: Generate Curriculum ---");
    const requirements = state.requirements.approved;
    const roadmap = state.roadmap.approved;
    const userId = state.user_id;
    // We can pass existing curriculum ID/Version if needed, but for now simple
    const options = {
        curriculumId: state.curriculum_id,
        version: state.curriculum_version_id
    };

    const draft = await generateCurriculum(requirements, roadmap, options, userId);
    
    return {
        curriculum: { draft, approved: null },
        pending_approval: "curriculum"
    };
};

export const approvalNode = async (state) => {
    // This node processes the user's decision
    console.log("--- Node: Process Decision ---");
    const stage = state.current_decision.stage;
    const decision = state.current_decision.decision;
    const feedback = state.current_decision.feedback;

    if (decision === 'revise') {
        // If revise, we effectively clear the draft of that stage to trigger regeneration?
        // Or we loop back.
        // For simplicity, we just clear pending_approval so the router can send it back to generation.
        return {
            pending_approval: "none", // will trigger regeneration logic in router
            last_user_message: feedback || `Revise ${stage}` // use feedback as prompt for revision
        };
    }

    // Approved
    const updates = { pending_approval: "none" };
    if (stage === 'requirements') {
        updates.requirements = { ...state.requirements, approved: state.requirements.draft };
    } else if (stage === 'roadmap') {
        updates.roadmap = { ...state.roadmap, approved: state.roadmap.draft };
    } else if (stage === 'curriculum') {
        updates.curriculum = { ...state.curriculum, approved: state.curriculum.draft };
    }
    
    return updates;
};
