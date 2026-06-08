import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function run() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain Java OOP in simple terms",
  });

  console.log(response.text);
}

run();
