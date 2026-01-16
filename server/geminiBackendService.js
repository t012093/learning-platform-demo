import { GoogleGenAI, Type } from "@google/genai";
import { retrieveContext } from "./ragService.js";
import fs from 'fs/promises';

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
    return "";
  }
  return key;
};

const getClient = () => {
  const key = getApiKey();
  if (!key) return null;
  // Initialize for Gemini API (not Vertex AI for now, assuming API key usage)
  const genAI = new GoogleGenAI({ apiKey: key });
  return genAI;
};

/**
 * Analyzes a document directly using Gemini's multimodal capabilities (File/Image).
 * Used when local text extraction fails (e.g. image-only PDFs).
 */
export const analyzeDocumentWithGemini = async (filePath, mimeType) => {
  const genAI = getClient();
  if (!genAI) throw new Error("Gemini API Key missing");

  console.log(`   [Gemini Vision] Analyzing document: ${filePath} (${mimeType})...`);
  try {
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    
    // Normalize mimeType
    let validMimeType = mimeType;
    if (mimeType === 'pdf') validMimeType = 'application/pdf';
    if (mimeType === 'audio') validMimeType = 'audio/mp3'; // Default to mp3 for generic audio
    
    const prompt = `
      You are an expert technical analyst.
      Analyze this document/image in extreme detail.
      
      If it contains text, summarize it.
      If it is a diagram, blueprint, or screenshot (e.g. Unity/Blender), DESCRIBE what is visually depicted.
      - What objects/structures are visible?
      - What technical concepts are implied (e.g. node graph, physics simulation, 3D model topology)?
      - Infer the learning goal from the visual context.
      
      Output a comprehensive summary in Japanese.
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: validMimeType, data: base64 } }
        ]
      }]
    });
    
    console.log("   [Gemini Vision] Analysis complete.");
    return result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || "分析できませんでした。";
  } catch (e) {
    console.error("   [Gemini Vision] Analysis Failed:", e);
    return "ファイルの視覚分析に失敗しました。";
  }
};

// --- Schemas ---

const requirementsSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Display title for the curriculum, e.g. 'Learn Python Basics (Beginner)'" },
    goal: { type: Type.STRING, description: "The core learning goal, e.g. 'Master Python basics'" },
    level: { type: Type.STRING, enum: ["beginner", "intermediate", "advanced"] },
    target_audience: { type: Type.STRING },
    constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
    success_criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
    materials: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: {
          material_id: { type: Type.STRING },
          ref: { type: Type.STRING }
        }
      } 
    }
  },
  required: ["summary", "goal", "level", "target_audience", "constraints", "success_criteria"]
};

const roadmapSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    overview: { type: Type.STRING },
    total_hours: { type: Type.NUMBER },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          module_id: { type: Type.STRING },
          title: { type: Type.STRING },
          objective: { type: Type.STRING },
          estimated_hours: { type: Type.NUMBER },
          order: { type: Type.NUMBER }
        },
        required: ["module_id", "title", "objective", "estimated_hours", "order"]
      }
    }
  },
  required: ["title", "overview", "total_hours", "modules"]
};

// Vibe Coding Template Schema (Partial for generation)
const curriculumSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.OBJECT, 
      properties: { jp: { type: Type.STRING }, en: { type: Type.STRING } },
      required: ["jp", "en"]
    },
    description: { 
      type: Type.OBJECT, 
      properties: { jp: { type: Type.STRING }, en: { type: Type.STRING } },
      required: ["jp", "en"]
    },
    content_mix: {
      type: Type.OBJECT,
      properties: {
        doc: { type: Type.NUMBER },
        chat: { type: Type.NUMBER },
        exercise: { type: Type.NUMBER },
        quiz: { type: Type.NUMBER },
        project: { type: Type.NUMBER }
      },
      required: ["doc", "chat", "exercise", "quiz", "project"]
    },
    assessment_mix: {
      type: Type.OBJECT,
      properties: {
        quiz: { type: Type.NUMBER },
        project: { type: Type.NUMBER },
        reflection: { type: Type.NUMBER },
        oral: { type: Type.NUMBER }
      },
      required: ["quiz", "project", "reflection", "oral"]
    },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          module_id: { type: Type.STRING },
          title: { type: Type.STRING },
          objective: { type: Type.STRING },
          prereq_modules: { type: Type.ARRAY, items: { type: Type.STRING } },
          estimated_hours: { type: Type.NUMBER },
          deliverable: { type: Type.STRING },
          assessment: { type: Type.STRING, enum: ["quiz", "project", "reflection", "oral"] },
          module_ui_hints: {
            type: Type.OBJECT,
            properties: {
              card_title: { type: Type.STRING },
              card_text: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] }
            },
            required: ["card_title", "card_text", "tags", "difficulty"]
          },
          lessons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                lesson_id: { type: Type.STRING },
                summary: { type: Type.STRING },
                estimated_min: { type: Type.NUMBER },
                unlock_rule: { type: Type.STRING, enum: ["doc_completed", "manual", "immediate"] },
                retry_policy: { type: Type.STRING, enum: ["review_then_retry", "none"] },
                doc_blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      content: { type: Type.STRING },
                      items: { type: Type.ARRAY, items: { type: Type.STRING } }, // for bullets
                      language: { type: Type.STRING } // for code
                    },
                    required: ["type"]
                  }
                },
                exercises: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: { type: Type.STRING },
                      expected: { type: Type.STRING }
                    },
                    required: ["prompt", "expected"]
                  }
                },
                quiz: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      q: { type: Type.STRING },
                      choices: { type: Type.ARRAY, items: { type: Type.STRING } },
                      answer: { type: Type.NUMBER }
                    },
                    required: ["q", "choices", "answer"]
                  }
                },
                ui_hints: {
                  type: Type.OBJECT,
                  properties: {
                    card_title: { type: Type.STRING },
                    card_text: { type: Type.STRING },
                    cta: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    time: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["card_title", "card_text", "cta", "difficulty", "time", "tags"]
                }
              },
              required: ["lesson_id", "summary", "estimated_min", "unlock_rule", "doc_blocks", "ui_hints"]
            }
          }
        },
        required: ["module_id", "title", "objective", "lessons", "module_ui_hints"]
      }
    }
  },
  required: ["title", "description", "content_mix", "assessment_mix", "modules"]
};


// --- Generators ---

/**
 * Generate Requirements Draft from user message and optional history.
 */
export const generateRequirements = async (message, attachments = [], userId) => {
  const genAI = getClient();
  if (!genAI) throw new Error("Gemini API Key missing");

  console.log("   [Gemini API] Starting Requirements generation...");
  let context = "";
  if (userId) {
      try {
          const docs = await retrieveContext(message, 3, userId);
          if (docs.length > 0) {
              console.log(`   [Gemini API] Retrieved ${docs.length} RAG docs for requirements.`);
              context = `\nReference Materials:\n${docs.map(d => `- ${d}`).join('\n')}\n`;
          }
      } catch (e) {
          console.warn("   [Gemini API] RAG retrieval skipped/failed:", e.message);
      }
  }

  const prompt = `
    User Request: "${message}"
    Attachments: ${JSON.stringify(attachments)}
    ${context}
    
    Generate a JSON object defining the curriculum requirements.
  `;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      systemInstruction: `
        You are an expert Learning Concierge. 
        Your goal is to analyze the user's request and extract structured learning requirements.
        - Identify the topic, goal, and difficulty level.
        - If the request is vague, infer the most likely intent (e.g. "learn python" -> "Python Basics").
        - Set concrete constraints and success criteria.
      `,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: requirementsSchema
      }
    });

    console.log("   [Gemini API] Requirements generation finished.");
    const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini full response:", JSON.stringify(result, null, 2));
      throw new Error("No text in Gemini response");
    }

    return JSON.parse(text);
  } catch (err) {
    console.error("   [Gemini API] Requirements generation failed:", err);
    throw err;
  }
};

/**
 * Generate Roadmap Draft from approved requirements.
 */
export const generateRoadmap = async (requirements) => {
  const genAI = getClient();
  if (!genAI) throw new Error("Gemini API Key missing");

  console.log("   [Gemini API] Starting Roadmap generation...");
  const prompt = `
    Based on these requirements: ${JSON.stringify(requirements)}
    
    Generate a JSON object defining the roadmap with 3 to 5 modules.
    Focus on a logical learning path from basics to advanced.
  `;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      systemInstruction: `
        You are a Curriculum Architect.
        Create a high-level roadmap based on the provided requirements.
        - Output MUST be valid JSON matching the schema.
        - Assign estimated hours for each module.
        - Ensure a logical progression (Foundations -> Practice -> Application).
      `,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: roadmapSchema
      }
    });

    console.log("   [Gemini API] Roadmap generation finished.");
    const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text in Gemini response (roadmap)");

    return JSON.parse(text);
  } catch (err) {
    console.error("   [Gemini API] Error during Roadmap generation:", err);
    throw err;
  }
};

/**
 * Generate Full Curriculum from approved requirements and roadmap.
 */
export const generateCurriculum = async (requirements, roadmap, options = {}, userId) => {
  const genAI = getClient();
  if (!genAI) throw new Error("Gemini API Key missing");

  console.log("   [Gemini API] Starting Curriculum generation (this may take time)...");
  let context = "";
  if (userId) {
      try {
          const docs = await retrieveContext(requirements.goal || "curriculum", 5, userId);
          if (docs.length > 0) {
              console.log(`   [Gemini API] Retrieved ${docs.length} RAG docs for curriculum.`);
              context = `\nReference Materials:\n${docs.map(d => `- ${d}`).join('\n')}\n`;
          }
      } catch (e) {
          console.warn("   [Gemini API] RAG retrieval skipped:", e.message);
      }
  }

  const prompt = `
    Requirements: ${JSON.stringify(requirements)}
    Roadmap: ${JSON.stringify(roadmap)}
    Current Curriculum ID: ${options.curriculumId || 'new'}
    Version: ${options.version || 1}
    ${context}
    
    Generate the full curriculum JSON.
  `;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      systemInstruction: `
        You are a Content Developer for 'Vibe Coding', a modern learning platform.
        Generate a detailed curriculum JSON based on the roadmap.
        
        CRITICAL RULES:
        - 'ui_template_id' must be 'vibe_coding'.
        - Create detailed 'lessons' for each module in the roadmap.
        - 'doc_blocks' should be rich and educational (markdown text, code snippets).
        - 'quiz' should have 1-3 questions per lesson.
        - 'unlock_rule' must be 'doc_completed'.
        - 'content_mix' and 'assessment_mix' must sum to 1.0.
        - Ensure 'lesson_id's are unique (e.g. m1-l1, m1-l2).
      `,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: curriculumSchema
      }
    });

    console.log("   [Gemini API] Curriculum generation finished.");
    const resText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resText) throw new Error("No text in Gemini response (curriculum)");

    const data = JSON.parse(resText);
    
    // Post-processing to ensure required fixed fields that might be hallucinated or omitted
    data.ui_template_id = "vibe_coding";
    if (options.curriculumId) data.curriculum_id = options.curriculumId;
    if (options.version) data.version = options.version;

    return data;
  } catch (err) {
    console.error("   [Gemini API] Curriculum generation failed:", err);
    throw err;
  }
};
