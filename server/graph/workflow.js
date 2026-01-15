import { StateGraph, END, START } from "@langchain/langgraph";
import { orchestratorNode, interviewerNode, architectNode, writerNode, analyzerNode, reviewerNode, approvalNode } from "./nodes.js";

// Define the state schema
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
    
    // Analysis results of attached files
    analysis: {
        value: (x, y) => y || x,
        default: () => null
    },
    
    // Review feedback for the generated content
    review: {
        value: (x, y) => y || x,
        default: () => null
    },
    
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
        .addNode("analyzer", analyzerNode)
        .addNode("interviewer", interviewerNode)
        .addNode("architect", architectNode)
        .addNode("writer", writerNode)
        .addNode("reviewer", reviewerNode)
        .addNode("approval", approvalNode)
        
        .addEdge(START, "orchestrator")
        
        .addConditionalEdges("orchestrator", routeNext, {
            "analyzer": "analyzer",
            "interviewer": "interviewer",
            "architect": "architect",
            "writer": "writer",
            "reviewer": "reviewer",
            "approval": "approval",
            [END]: END
        })
        
        // Return paths to supervisor
        .addEdge("analyzer", "orchestrator")
        .addEdge("reviewer", "orchestrator")
        .addEdge("approval", "orchestrator")
        
        // Specialized agents end the turn to wait for user input (interrupt)
        .addEdge("interviewer", END)
        .addEdge("architect", END)
        .addEdge("writer", END);

    return workflow.compile();
};

