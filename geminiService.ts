
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTaskBreakdown = async (taskTitle: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Please break down the task "${taskTitle}" into 3-5 actionable sub-steps.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['step', 'description']
            }
          }
        },
        required: ['steps']
      }
    }
  });

  return JSON.parse(response.text) as { steps: { step: string; description: string }[] };
};

export const suggestPriority = async (taskTitle: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the task: "${taskTitle}". Which priority level is most appropriate? (low, medium, high). Return ONLY the word.`,
  });
  return response.text.trim().toLowerCase() as 'low' | 'medium' | 'high';
};
