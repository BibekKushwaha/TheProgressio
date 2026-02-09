import { aiService } from "../services/ai.service.js";

async function testAI() {
    console.log("Testing AI Service...");

    const text = "Study for Math exam next Monday";
    console.log(`Input: "${text}"`);

    try {
        const result = await aiService.parseTaskIntent(text);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

testAI();
