
// @google/genai Service for Room Redesign and Analysis
import { GoogleGenAI, Type } from "@google/genai";
import { DesignStyle } from "../types";

export interface DesignResult {
  imageUrl: string;
  materials: string[];
  designPhilosophy: string;
}

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const redesignRoom = async (base64Images: string[], style: DesignStyle, customPrompt?: string): Promise<DesignResult> => {
  const ai = getAI();
  
  // ვამზადებთ ფოტოებს და ტექსტურ ინსტრუქციას ერთიანი კონტენტისთვის
  const parts: any[] = base64Images.map(b64 => ({
    inlineData: {
      data: b64,
      mimeType: 'image/jpeg',
    },
  }));

  // ტექსტური მოთხოვნა, რომელიც აიძულებს მოდელს ახალი სურათის გენერირებას
  parts.push({
    text: `RE-DESIGN THIS ROOM. 
    Style: ${style}. 
    Additional Instructions: ${customPrompt || 'Professional, high-end interior design.'}
    
    TASK: Generate a NEW photorealistic high-resolution image showing this room completely redesigned. 
    Also, provide a short description of the changes in GEORGIAN (ქართულად).`
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: [{ parts }],
      config: {
        systemInstruction: "You are a professional interior design AI. You transform room photos into high-quality 3D renders based on specific styles. Always provide an image and a brief Georgian description.",
        imageConfig: {
          aspectRatio: "16:9"
        },
      }
    });

    let imageUrl = "";
    let designPhilosophy = "";

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          designPhilosophy += part.text.trim();
        }
      }
    }

    if (!imageUrl) {
      // თუ სურათი არ მოვიდა, შესაძლოა უსაფრთხოების ფილტრმა დაბლოკა ან მოდელმა მხოლოდ ტექსტი დააბრუნა
      throw new Error("AI-მ ვერ შექმნა სურათი. სცადეთ სხვა ფოტო ან შეცვალეთ მოთხოვნა.");
    }

    return {
      imageUrl,
      materials: ["პრემიუმ მასალები", "ინტეგრირებული განათება", "ეკომეგობრული ტექსტურები"],
      designPhilosophy: designPhilosophy || "თქვენი სივრცის ახალი, გაუმჯობესებული ხედვა."
    };
  } catch (error: any) {
    console.error("Redesign error:", error);
    if (error.message?.includes("safety")) {
      throw new Error("ფოტო ვერ დამუშავდა უსაფრთხოების ფილტრის გამო. გთხოვთ ატვირთოთ სხვა ფოტო.");
    }
    throw error;
  }
};

export const getImprovements = async (base64Images: string[]): Promise<{ questions: string[], analysis: string }> => {
  const ai = getAI();
  const imageParts = base64Images.map(b64 => ({
    inlineData: {
      data: b64,
      mimeType: 'image/jpeg',
    },
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          ...imageParts,
          { text: "Analyze this room and give 3 interior design tips in Georgian. Return as JSON with keys 'questions' (array) and 'analysis' (string)." },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: { type: Type.ARRAY, items: { type: Type.STRING } },
            analysis: { type: Type.STRING }
          },
          required: ["questions", "analysis"]
        }
      }
    });

    return JSON.parse(response.text?.trim() || "{}");
  } catch (e) {
    return {
      questions: ["როგორი ფერები მოგწონთ?", "რა არის ოთახის მთავარი დანიშნულება?", "განათებაზე რა აზრის ხართ?"],
      analysis: "ანალიზი დროებით მიუწვდომელია."
    };
  }
};
