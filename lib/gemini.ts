// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Hum fast aur efficient model use karenge
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
