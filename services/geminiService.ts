import { GoogleGenAI } from "@google/genai";

// Lazy initialize the AI client.
const getAI = () => {
  // Access process.env.API_KEY safely.
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  let apiKey = '';
  try {
    apiKey = process.env.API_KEY || '';
  } catch (e) {
    console.warn("process.env is not accessible");
  }

  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will not work.");
  }
  return new GoogleGenAI({ apiKey: apiKey });
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
      contents: `Translate the following text to Chinese (Simplified). Return the translated text directly.\n\nText:\n${text}`,
      config: {
        systemInstruction: "You are a professional translator. Translate English or other languages to Chinese.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw new Error("Failed to translate text.");
  }
};

export const performOCR = async (imageBase64: string, format: 'word' | 'excel' | 'txt'): Promise<string> => {
  try {
    const ai = getAI();
    
    let prompt = "";
    if (format === 'excel') {
      prompt = "Analyze this document image. Extract all tabular data and form fields into a single clean HTML <table>. Do not include markdown ticks, html or body tags. Just the table.";
    } else if (format === 'word') {
      prompt = "Analyze this document image. Transcribe all text, preserving paragraphs, headers, and lists. Format the output as clean HTML (using <h1>, <p>, <ul>, etc.) suitable for a Word document body. Do not include markdown ticks.";
    } else {
      prompt = "Analyze this document image. Transcribe all text exactly as it appears. Return only the plain text.";
    }

    // Remove header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is efficient for OCR tasks
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    let result = response.text || "";
    // Clean up markdown if the model includes it despite instructions
    result = result.replace(/```html/g, '').replace(/```/g, '');
    return result;

  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw new Error("OCR processing failed.");
  }
};