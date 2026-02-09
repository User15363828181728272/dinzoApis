
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const callGemini = async (
  messages: Message[], 
  systemInstruction: string,
  image?: string,
  retryCount = 0
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Handle image if provided
  if (image) {
    const lastMsg = contents[contents.length - 1];
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';
    
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };
    lastMsg.parts.push(imagePart as any);
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      // Switching to Flash model to help with the 429 Resource Exhausted errors on free tier
      model: 'gemini-3-flash-preview', 
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      },
    });

    return response.text || "Pesan kosong nih, coba lagi ya.";
  } catch (error: any) {
    // Implement exponential backoff for 429 errors
    if (error?.status === 429 && retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      await delay(waitTime);
      return callGemini(messages, systemInstruction, image, retryCount + 1);
    }
    
    console.error("Gemini Error:", error);
    if (error?.status === 429) {
      return "Waduh, kuota API lagi penuh banget (429). Tunggu bentar terus coba lagi ya!";
    }
    return "Maaf, ada kendala koneksi ke otak Soraa. Coba cek internet kamu.";
  }
};
