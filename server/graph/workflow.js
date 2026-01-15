import { StateGraph, END, START } from "@langchain/langgraph";
import { orchestratorNode, interviewerNode, architectNode, approvalNode } from "./nodes.js";

// Define the state schema (channels)
const graphState = {
    user_id: null,
    curriculum_id: null,
    curriculum_version_id: null,
    
    // Message History
    messages: {
        value: (x, y) => x.concat(y),
        default: () => []
    },
    
    // Content State
    requirements: {
        value: (x, y) => ({ ...x, ...y }),
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
    
    // Control State
    pending_approval: null, 
    active_agent: null,     
    next_actor: null,       
    
    // Current user interaction (decision or message)
    current_decision: null,
    
    // File Attachments
    attachments: {
        value: (x, y) => y || x, 
        default: () => []
    }
};

// --- Routing ---

const routeNext = (state) => {
    const next = state.next_actor;
    if (next === "end" || !next) return END;
    return next;
};

// --- Graph Construction ---

export const createCurriculumGraph = () => {
    const workflow = new StateGraph({ channels: graphState })
        .addNode("orchestrator", orchestratorNode)
        .addNode("interviewer", interviewerNode)
        .addNode("architect", architectNode)
        .addNode("approval", approvalNode)
        
        .addEdge(START, "orchestrator")
        
        .addConditionalEdges("orchestrator", routeNext, {
            "interviewer": "interviewer",
            "architect": "architect",
            "approval": "approval",
            [END]: END
        })
        
        // After processing approval, go back to orchestrator to decide next actor
        .addEdge("approval", "orchestrator")
        
        // Leaf nodes always end the turn to wait for user input
        .addEdge("interviewer", END)
        .addEdge("architect", END);

    return workflow.compile();
};
