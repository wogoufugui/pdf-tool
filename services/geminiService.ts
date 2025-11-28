import { GoogleGenAI } from "@google/genai";

// Lazy initialize the AI client.
// This prevents the application from crashing at startup (white screen) if
// process.env.API_KEY causes a reference error during initial module evaluation.
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will not work.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export const convertToTable = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract the data from the following text and format it as a clean HTML <table>. Do not include <html>, <body> or markdown code blocks, just the <table> element.\n\nText:\n${text.substring(0, 10000)}`,
      config: {
        systemInstruction: "You are a data extraction specialist. Your goal is to structure unstructured text into tables.",
      }
    });
    // Strip markdown code blocks if present
    let cleanHtml = response.text || "";
    cleanHtml = cleanHtml.replace(/```html/g, '').replace(/```/g, '');
    return cleanHtml;
  } catch (error) {
    console.error("Gemini Conversion Error:", error);
    throw new Error("Failed to convert text to table.");
  }
};

export const translateText = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following text into Simplified Chinese. Return only the translated text.\n\nText:\n${text}`,
      config: {
        systemInstruction: "You are a professional translator fluent in English and Chinese.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw new Error("Failed to translate text.");
  }
};