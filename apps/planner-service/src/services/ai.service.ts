
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

// Log warning if no key is provided
if (!API_KEY) {
    console.warn("⚠️ No GEMINI_API_KEY found in environment variables. AI features will fail or use a possibly invalid fallback.");
} else {
    // Log masked key for verification
    console.log(`✅ AI Service initialized with key: ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export class AIService {
    private model = genAI ? genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    }) : null;

    // Using flash-8b as fallback or same flash model as it has better limits/availability than pro-1.0
    private fallbackModel = genAI ? genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    }) : null;

    /**
     * Parses raw text to extract task metadata using Gemini.
     */
    async parseTaskIntent(text: string): Promise<{
        title: string;
        description?: string;
        dueDate?: Date;
        priority?: "LOW" | "MEDIUM" | "HIGH";
        subject?: string;
        effort?: string;
        type?: "ASSIGNMENT" | "EXAM" | "STUDY_GOAL";
    }> {
        if (!this.model) {
            console.warn("⚠️ AI Service not initialized (missing key). Using fallback.");
            return this.fallbackParse(text);
        }

        const prompt = `
        You are a smart planner assistant. Parse the following text into a JSON object with keys: 
        - title (string)
        - description (string, optional)
        - dueDate (ISO 8601 string, optional. Assume current year ${new Date().getFullYear()} if not specified)
        - priority (LOW, MEDIUM, HIGH)
        - subject (string, optional, inferred from context like "Math", "History")
        - effort (string, optional, use values like "15m", "30m", "1h", "2h", "4h+" based on context)
        - type (ASSIGNMENT, EXAM, STUDY_GOAL. Default to ASSIGNMENT if unclear, EXAM if "test" or "exam" mentioned)

        Text: "${text}"
        
        Return ONLY valid JSON.
        `;

        try {
            return await this.generateWithModel(this.model, prompt, text);
        } catch (error) {
            console.warn("⚠️ Primary AI model failed:", error);
            console.warn("Trying fallback model (gemini-pro)...");
            try {
                if (this.fallbackModel) {
                    return await this.generateWithModel(this.fallbackModel, prompt, text);
                }
                throw error;
            } catch (fallbackError) {
                console.warn("⚠️ AI Service failed completely:", fallbackError);
                console.warn("Using basic fallback parser.");
                return this.fallbackParse(text);
            }
        }
    }

    private async generateWithModel(model: any, prompt: string, originalText: string) {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        // Robust JSON extraction: look for the first '{' and the last '}'
        const jsonStart = textResponse.indexOf('{');
        const jsonEnd = textResponse.lastIndexOf('}');

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("No JSON found in response");
        }

        const jsonString = textResponse.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonString);

        return {
            title: data.title || originalText,
            description: data.description,
            priority: data.priority,
            type: data.type,
            subject: data.subject,
            effort: data.effort,
            ...(data.dueDate && { dueDate: new Date(data.dueDate) })
        };
    }

    private fallbackParse(text: string) {
        // Advanced Heuristic Parsing Fallback
        const lowerText = text.toLowerCase();

        // Priority Detection
        const isHighPriority = /urgent|important|high priority|asap|critical/.test(lowerText);
        const isLowPriority = /low priority|trivial|minor|whenever/.test(lowerText);

        // Type Detection
        const isExam = /exam|test|midterm|final|quiz/.test(lowerText);
        const isStudy = /study|read|revise|review|learn/.test(lowerText);

        // Subject Detection (Basic List)
        const subjects = ["math", "mathematics", "physics", "chemistry", "biology", "history", "english", "literature", "geography", "science", "coding", "programming", "cs", "computer science", "spanish", "french"];
        const foundSubject = subjects.find(s => lowerText.includes(s));
        const formattedSubject = foundSubject ? foundSubject.charAt(0).toUpperCase() + foundSubject.slice(1) : undefined;

        // Effort Detection
        const effortRegex = /(\d+)\s*(h|hr|hours?|m|min|minutes?)/i;
        const effortMatch = text.match(effortRegex);
        let effort: string | undefined;
        if (effortMatch) {
<<<<<<< HEAD
            effort = `${effortMatch[1]}${effortMatch[2]?.startsWith('h') ? 'h' : 'm'}`;
=======
            const amount = effortMatch[1];
            const unit = effortMatch[2]?.toLowerCase();
            if (amount) {
                effort = `${amount}${unit?.startsWith("h") ? "h" : "m"}`;
            }
>>>>>>> origin/main
        }

        // Date & Time Detection
        let dueDate: Date | undefined = undefined;
        const now = new Date();

        // "Tomorrow", "Today"
        if (lowerText.includes("tomorrow")) {
            dueDate = new Date(now);
            dueDate.setDate(now.getDate() + 1);
        } else if (lowerText.includes("today")) {
            dueDate = new Date(now);
        } else if (lowerText.includes("day after tomorrow")) {
            dueDate = new Date(now);
            dueDate.setDate(now.getDate() + 2);
        }

        // "Next [Day]" or "This [Day]" logic
        if (!dueDate) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayRegex = new RegExp(`(this|next)?\\s*(${days.join('|')})`, 'i');
            const dayMatch = lowerText.match(dayRegex);

            if (dayMatch) {
                const modifier = dayMatch[1]; // "this" or "next"
                const dayName = dayMatch[2];
<<<<<<< HEAD
                const dayIndex = days.indexOf(dayName!);
                const currentDayIndex = now.getDay();
=======
                if (dayName) {
                    const dayIndex = days.indexOf(dayName);
                    const currentDayIndex = now.getDay();
>>>>>>> origin/main

                    let daysToAdd = (dayIndex - currentDayIndex + 7) % 7;
                    if (daysToAdd === 0 && !modifier) daysToAdd = 7; // If today is Monday and user says "Monday", assume next Monday unless specified
                    if (modifier === 'next') daysToAdd += 7;

                    dueDate = new Date(now);
                    dueDate.setDate(now.getDate() + daysToAdd);
                }
            }
        }

        // Time Detection (e.g., "at 5pm", "by 14:00")
        const timeRegex = /(?:at|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
        const timeMatch = lowerText.match(timeRegex);

        if (dueDate && timeMatch) {
<<<<<<< HEAD
            let hours = parseInt(timeMatch[1]!);
            const minutes = parseInt(timeMatch[2] || "0");
            const meridiem = timeMatch[3];
=======
            const hourMatch = timeMatch[1];
            if (!hourMatch) {
                dueDate.setHours(23, 59, 0, 0);
            } else {
                let hours = parseInt(hourMatch, 10);
                const minutes = parseInt(timeMatch[2] || "0");
                const meridiem = timeMatch[3];
>>>>>>> origin/main

                if (meridiem === 'pm' && hours < 12) hours += 12;
                if (meridiem === 'am' && hours === 12) hours = 0;

                dueDate.setHours(hours, minutes, 0, 0);
            }
        } else if (dueDate) {
            // Default to end of day if no time specified
            dueDate.setHours(23, 59, 0, 0);
        }

        const result: any = {
            title: text,
            description: "Automatically created via Smart Create (Fallback Parsing)",
            priority: isHighPriority ? "HIGH" : isLowPriority ? "LOW" : "MEDIUM",
            type: isExam ? "EXAM" : isStudy ? "STUDY_GOAL" : "ASSIGNMENT",
            subject: formattedSubject,
            effort: effort
        };

        if (dueDate) {
            result.dueDate = dueDate;
        }

        return result;
    }

    /**
     * Generates subtasks for a given task description.
     */
    async generateSubtasks(taskTitle: string, description?: string): Promise<string[]> {
        if (!this.model) {
            return this.fallbackSubtasks(taskTitle);
        }

        const prompt = `
        Break down the following academic task into 3-5 distinct, actionable subtasks (approx 20 mins each).
        Return ONLY a JSON array of strings.

        Task: ${taskTitle}
        Details: ${description || "N/A"}
        `;

        try {
            return await this.generateSubtasksWithModel(this.model, prompt);
        } catch (error) {
            console.warn("⚠️ Primary AI model failed for subtasks. Trying fallback model...");
            try {
                if (this.fallbackModel) {
                    return await this.generateSubtasksWithModel(this.fallbackModel, prompt);
                }
                throw error;
            } catch (fallbackError) {
                console.warn("⚠️ AI Subtasks failed completely. Returning generic steps.");
                return this.fallbackSubtasks(taskTitle);
            }
        }
    }

    private async generateSubtasksWithModel(model: any, prompt: string): Promise<string[]> {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        // Robust JSON extraction for array
        const jsonStart = textResponse.indexOf('[');
        const jsonEnd = textResponse.lastIndexOf(']');

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("No JSON array found in response");
        }

        const jsonString = textResponse.substring(jsonStart, jsonEnd + 1);
        const subtasks = JSON.parse(jsonString);

        if (Array.isArray(subtasks)) {
            return subtasks;
        }
        return [];
    }

    private fallbackSubtasks(taskTitle: string): string[] {
        return [
            `Prepare materials for ${taskTitle}`,
            `Work on ${taskTitle} (Session 1)`,
            `Review progress on ${taskTitle}`
        ];
    }
}

export const aiService = new AIService();
