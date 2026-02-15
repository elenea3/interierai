
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
  
  const imageParts = base64Images.map(b64 => ({
    inlineData: {
      data: b64,
      mimeType: 'image/jpeg',
    },
  }));

  const systemInstruction = `You are an expert Interior Designer. Your task is to redesign the room shown in the provided photo using the ${style} style. 
Additional requirements: ${customPrompt || 'Make it look professional and aesthetically pleasing.'}
OUTPUT RULES:
1. You MUST generate a high-quality, photorealistic image of the redesigned room.
2. You MUST provide a short description of your design choices strictly in Georgian (ქართულად).
3. Do not include any technical explanations or meta-talk.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: imageParts,
      },
      config: {
        systemInstruction: systemInstruction,
        imageConfig: {
          aspectRatio: "16:9"
        },
      }
    });

    let imageUrl = "";
    let designPhilosophy = "";

    // Iterate through all parts to find the image and the text description
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          designPhilosophy += part.text.trim();
        }
      }
    }

    if (!imageUrl) {
      throw new Error("AI-მ ვერ შეძლო სურათის გენერირება. სცადეთ სხვა ფოტო.");
    }

    return {
      imageUrl,
      materials: ["ნატურალური მასალები", "ინტერიერის განათება", "პრემიუმ ტექსტურები"],
      designPhilosophy: designPhilosophy || "თანამედროვე დიზაინისა და ფუნქციონალურობის ბალანსი."
    };
  } catch (error: any) {
    console.error("Redesign error:", error);
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
      contents: {
        parts: [
          ...imageParts,
          { text: "გააანალიზე ეს ოთახი და მომეცი 3 დიზაინერული რჩევა ქართულად. პასუხი დააბრუნე JSON ფორმატში keys: 'questions' (array), 'analysis' (string)." },
        ],
      },
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
    console.error("Analysis failure", e);
    return {
      questions: ["რა ფერები მოგწონთ?", "რა არის ოთახის დანიშნულება?", "განათებაზე რა აზრის ხართ?"],
      analysis: "ანალიზი ამჟამად მიუწვდომელია."
    };
  }
};
