import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY) {
  // It seems like there's no listModels in the node SDK easily available or exposed in this version
  // Let's try to check the version of the package
}
