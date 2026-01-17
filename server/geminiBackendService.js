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

// --- DocChapter Compatible Schema (Rich Content) ---

// Localized text for bilingual support
const localizedTextSchema = {
  type: Type.OBJECT,
  properties: {
    en: { type: Type.STRING, description: "English text" },
    jp: { type: Type.STRING, description: "Japanese text" }
  },
  required: ["en", "jp"]
};

// Rich content block types
const docBlockSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ["text", "callout", "code", "list", "mermaid"],
      description: "Block type - use varied types for engaging content"
    },
    // For 'text' type
    text: localizedTextSchema,
    style: { type: Type.STRING, enum: ["normal", "lead", "quote"], description: "Text style - use 'lead' for intro paragraphs" },
    // For 'callout' type
    variant: { type: Type.STRING, enum: ["info", "warning", "tip", "success"], description: "Callout style" },
    title: localizedTextSchema,
    // For 'code' type
    code: { type: Type.STRING, description: "Code content" },
    language: { type: Type.STRING, description: "Programming language" },
    filename: { type: Type.STRING, description: "Optional filename for context" },
    // For 'list' type
    items: { type: Type.ARRAY, items: localizedTextSchema, description: "List items" },
    listStyle: { type: Type.STRING, enum: ["bullet", "number"], description: "List style" },
    // For 'mermaid' type
    chart: { type: Type.STRING, description: "Mermaid diagram syntax" },
    caption: localizedTextSchema
  },
  required: ["type"]
};

// Section with multiple content blocks
const docSectionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique section ID like '1-1', '1-2'" },
    title: localizedTextSchema,
    content: {
      type: Type.ARRAY,
      items: docBlockSchema,
      description: "Array of content blocks - include 4-6 varied blocks per section"
    }
  },
  required: ["id", "title", "content"]
};

// Quiz question schema
const quizQuestionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    text: localizedTextSchema,
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: localizedTextSchema
        },
        required: ["id", "text"]
      }
    },
    correctAnswer: { type: Type.STRING, description: "ID of correct option" },
    explanation: localizedTextSchema
  },
  required: ["id", "text", "options", "correctAnswer"]
};

// Lesson schema (DocChapter compatible)
const lessonSchema = {
  type: Type.OBJECT,
  properties: {
    lesson_id: { type: Type.STRING, description: "Unique ID like 'm1-l1'" },
    title: localizedTextSchema,
    subtitle: localizedTextSchema,
    reading_time: localizedTextSchema,
    estimated_min: { type: Type.NUMBER, description: "Estimated reading time in minutes" },
    sections: {
      type: Type.ARRAY,
      items: docSectionSchema,
      description: "2-4 sections per lesson, each with rich content"
    },
    quiz: {
      type: Type.OBJECT,
      properties: {
        title: localizedTextSchema,
        questions: { type: Type.ARRAY, items: quizQuestionSchema }
      }
    }
  },
  required: ["lesson_id", "title", "subtitle", "reading_time", "estimated_min", "sections"]
};

// Module schema
const moduleSchema = {
  type: Type.OBJECT,
  properties: {
    module_id: { type: Type.STRING },
    title: localizedTextSchema,
    objective: localizedTextSchema,
    estimated_hours: { type: Type.NUMBER },
    lessons: { type: Type.ARRAY, items: lessonSchema }
  },
  required: ["module_id", "title", "objective", "estimated_hours", "lessons"]
};

// Full curriculum schema
const curriculumSchema = {
  type: Type.OBJECT,
  properties: {
    title: localizedTextSchema,
    description: localizedTextSchema,
    ui_template_id: { type: Type.STRING, enum: ["doc_chapter"] },
    modules: { type: Type.ARRAY, items: moduleSchema }
  },
  required: ["title", "description", "modules"]
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
 * Produces rich DocChapter format content with bilingual support.
 */
export const generateCurriculum = async (requirements, roadmap, options = {}, userId) => {
  const genAI = getClient();
  if (!genAI) throw new Error("Gemini API Key missing");

  console.log("   [Gemini API] Starting Rich Curriculum generation...");
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

  // Enhanced prompt with detailed structure
  const prompt = `
## TASK: Generate a Complete Educational Curriculum

### INPUT DATA
**Requirements:**
${JSON.stringify(requirements, null, 2)}

**Roadmap:**
${JSON.stringify(roadmap, null, 2)}

${context ? `**Reference Materials:**\n${context}` : ''}

### OUTPUT REQUIREMENTS

Generate a JSON curriculum with RICH, EDUCATIONAL CONTENT.
- Each module should have 1-2 lessons
- Each lesson should have 2-3 sections  
- Each section should have 4-6 content blocks
- ALL text must be bilingual (English AND Japanese)

Focus on making the content TRULY EDUCATIONAL - not just summaries.
Include practical examples, diagrams, and real-world analogies.
  `;

  // Comprehensive system instruction for rich content generation
  const systemInstruction = `
You are a MASTER Educational Content Developer for 'Lumina Learning Platform'.
Your goal is to create PREMIUM, ENGAGING, and DEEPLY EDUCATIONAL curriculum content.

## YOUR CONTENT PHILOSOPHY

1. **Teach Through Stories**: Use real-world analogies (like "think of a variable as a box" or "API is like a restaurant waiter")
2. **Visualize Concepts**: Include Mermaid diagrams for EVERY major concept
3. **Highlight Key Points**: Use callout blocks for tips, warnings, and important notes
4. **Show, Don't Tell**: Include practical code examples that learners can run
5. **Bilingual Excellence**: Both English and Japanese text should be natural, not just translations

## CONTENT BLOCK TYPES (Use ALL of these!)

### 1. Text Block (Use 'lead' style for opening paragraphs!)
{
  "type": "text",
  "text": {
    "en": "Variables are containers that store data values. Think of them as labeled boxes where you can put things.",
    "jp": "変数はデータ値を格納するコンテナです。ラベルの付いた箱のようなもので、中に物を入れることができます。"
  },
  "style": "lead"
}

### 2. Mermaid Diagram (ESSENTIAL for visual learning!)
{
  "type": "mermaid",
  "chart": "graph TD\\n  A[User Input] --> B{Validate}\\n  B -->|Valid| C[Process]\\n  B -->|Invalid| D[Show Error]\\n  C --> E[Return Result]",
  "caption": {
    "en": "Data flow diagram showing input validation",
    "jp": "入力バリデーションを示すデータフロー図"
  }
}

### 3. Callout Block (Use for tips, warnings, important notes)
{
  "type": "callout",
  "variant": "tip",
  "title": { "en": "Pro Tip", "jp": "プロのコツ" },
  "text": {
    "en": "Use meaningful variable names like 'user_age' instead of 'x'. Your future self will thank you!",
    "jp": "'x'の代わりに'user_age'のような意味のある変数名を使いましょう。将来の自分が感謝するでしょう！"
  }
}

### 4. Code Block (Include filename for context!)
{
  "type": "code",
  "language": "python",
  "filename": "variables_example.py",
  "code": "# Good variable naming\\nuser_name = 'Alice'\\nuser_age = 25\\n\\n# Using variables\\nprint(f'{user_name} is {user_age} years old')"
}

### 5. List Block (Use for step-by-step or key concepts)
{
  "type": "list",
  "items": [
    { "en": "**Variables** store data temporarily in memory", "jp": "**変数**はメモリ内に一時的にデータを格納する" },
    { "en": "**Constants** are variables that never change", "jp": "**定数**は決して変更されない変数" },
    { "en": "**Data types** define what kind of data a variable holds", "jp": "**データ型**は変数が保持するデータの種類を定義する" }
  ],
  "listStyle": "bullet"
}

## SECTION STRUCTURE TEMPLATE

Each section should follow this pattern:
1. **Opening** (text with style:'lead') - Hook the learner with an analogy or question
2. **Visual** (mermaid) - Show the concept visually
3. **Details** (text + list) - Explain the specifics
4. **Example** (code) - Practical demonstration
5. **Key Takeaway** (callout with variant:'success') - Summarize what they learned

## QUIZ GUIDELINES

Include 2-3 quiz questions per lesson:
- Mix conceptual and practical questions
- Provide clear explanations for correct answers
- Make options distinct (no trick questions)

## CRITICAL RULES

1. ALL text fields MUST have both 'en' and 'jp' values
2. Each section MUST have 4-6 content blocks minimum
3. Include at least 1 mermaid diagram per lesson
4. Include at least 2 callout blocks per lesson
5. Make code examples practical and runnable
6. Use "\\\\n" for newlines in mermaid charts (double-escaped for JSON)
7. lesson_id format: "m{module}-l{lesson}" e.g., "m1-l1"
8. section id format: "{lesson}-s{section}" e.g., "l1-s1"

Generate content that would make learners EXCITED to continue learning!
`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      systemInstruction: systemInstruction,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: curriculumSchema,
        maxOutputTokens: 65536  // Increase token limit for complex curricula
      }
    });

    console.log("   [Gemini API] Rich Curriculum generation finished.");
    const resText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resText) throw new Error("No text in Gemini response (curriculum)");

    // Try to parse JSON with better error handling
    let data;
    try {
      data = JSON.parse(resText);
    } catch (parseErr) {
      console.error("   [Gemini API] JSON parse error. Raw response:", resText.substring(0, 500) + "...");
      throw new Error(`Failed to parse curriculum JSON: ${parseErr.message}`);
    }

    // Post-processing
    data.ui_template_id = "doc_chapter";
    if (options.curriculumId) data.curriculum_id = options.curriculumId;
    if (options.version) data.version = options.version;

    // Log stats for debugging
    const moduleCount = data.modules?.length || 0;
    const lessonCount = data.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
    console.log(`   [Gemini API] Generated: ${moduleCount} modules, ${lessonCount} lessons`);

    return data;
  } catch (err) {
    console.error("   [Gemini API] Curriculum generation failed:", err);
    throw err;
  }
};

