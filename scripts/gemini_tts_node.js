import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateAudioContent = async (speechScript, modelName = "gemini-2.5-flash-preview-tts") => {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  // 5-Element Prompt for expressive narration
  const prompt = `
# AUDIO PROFILE: Rise Path
## Professional AI Tutor / Friendly Guide

## THE SCENE: Private Study Room
Quiet atmosphere, close proximity, warm lighting.

### DIRECTOR'S NOTES
Style:
- Encouraging, Intellectual but accessible, Warm.
Pacing:
- Moderate speed, pause significantly after key concepts.
Accent:
- Neutral Japanese (Standard).

### SAMPLE CONTEXT
Narrating a course slide for a learner.

#### TRANSCRIPT
${speechScript}
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "audio/mp3",
      },
    });

    const candidates = response.response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No audio candidates returned from Gemini.");
    }

    const part = candidates[0].content.parts[0];
    if (!part.inlineData || !part.inlineData.data) {
       throw new Error("No inline audio data found in response.");
    }

    return part.inlineData.data; // Return base64 string
  } catch (error) {
    console.error("Gemini Audio Generation Failed:", error);
    throw error;
  }
};
