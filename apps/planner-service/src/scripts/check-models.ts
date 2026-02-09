import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  console.log("Using key:", API_KEY.slice(0,4));

  async function check() {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hello");
      console.log("1.5-flash OK:", result.response.text());
    } catch (e: any) {
      console.log("1.5-flash Error:", e.message);
    }
    
    try {
       const model = genAI.getGenerativeModel({ model: "gemini-pro" });
       const result = await model.generateContent("Hello");
       console.log("gemini-pro OK:", result.response.text());
    } catch (e: any) {
       console.log("gemini-pro Error:", e.message);
    }
  }
  check();
} else {
  console.log("No key");
}
