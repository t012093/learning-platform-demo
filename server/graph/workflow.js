import { StateGraph, END, START } from "@langchain/langgraph";
import { generateRequirementsNode, generateRoadmapNode, generateCurriculumNode, approvalNode } from "./nodes.js";

// Define the state schema (channels)
// In JS, we define the structure of the object we pass around.
// We use a simple reducer (overwrite) for most fields.

const graphState = {
    user_id: null,
    curriculum_id: null,
    curriculum_version_id: null,
    
    // Chat & Input
    last_user_message: null,
    attachments: null,
    
    // Content State
    requirements: {
        value: (x, y) => ({ ...x, ...y }), // Shallow merge
        default: () => ({})
    },
    roadmap: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    },
    curriculum: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    },
    
    // Workflow State
    pending_approval: null, // "requirements" | "roadmap" | "curriculum" | "none"
    current_decision: null // { stage, decision, feedback } passed from outside
};

// --- Router ---

const routeAfterGeneration = (state) => {
    // After generation, we always pause for approval (interrupt).
    // The "pending_approval" flag in state indicates where we are.
    // In LangGraph, we can use `interrupt` inside the node, or just end the turn.
    // Here we end the turn, and the "approval" comes as a new input to `approvalNode`.
    return "__end__"; 
};

const routeAfterApproval = (state) => {
    const { requirements, roadmap, curriculum, pending_approval } = state;
    const decision = state.current_decision?.decision;

    // If revise, go back to generation
    if (decision === 'revise') {
        const stage = state.current_decision.stage;
        if (stage === 'requirements') return "generate_requirements";
        if (stage === 'roadmap') return "generate_roadmap";
        if (stage === 'curriculum') return "generate_curriculum";
    }

    // If approved, move to next stage
    // Check what is approved
    if (requirements.approved && !roadmap.approved && !roadmap.draft) {
        return "generate_roadmap";
    }
    if (roadmap.approved && !curriculum.approved && !curriculum.draft) {
        return "generate_curriculum";
    }
    
    return "__end__";
};

const routeStart = (state) => {
    // Based on what we have, decide where to go.
    // If we have nothing, start requirements.
    if (!state.requirements?.draft && !state.requirements?.approved) {
        return "generate_requirements";
    }
    // If we have a decision incoming, go to approval processing
    if (state.current_decision) {
        return "process_approval";
    }
    
    // Otherwise, check if we need to generate something
    if (state.requirements?.approved && !state.roadmap?.draft) {
        return "generate_roadmap";
    }
    if (state.roadmap?.approved && !state.curriculum?.draft) {
        return "generate_curriculum";
    }

    return "__end__";
};

// --- Graph Construction ---

export const createCurriculumGraph = () => {
    const workflow = new StateGraph({ channels: graphState })
        .addNode("generate_requirements", generateRequirementsNode)
        .addNode("generate_roadmap", generateRoadmapNode)
        .addNode("generate_curriculum", generateCurriculumNode)
        .addNode("process_approval", approvalNode)
        
        .addConditionalEdges(START, routeStart)
        
        .addEdge("generate_requirements", END) // Wait for approval
        .addEdge("generate_roadmap", END)      // Wait for approval
        .addEdge("generate_curriculum", END)   // Wait for approval
        
        .addConditionalEdges("process_approval", routeAfterApproval);

    return workflow.compile();
};
