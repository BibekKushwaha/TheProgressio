
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

export interface ParsedTaskIntent {
    title: string;
    description?: string;
    dueDate?: Date;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    subject?: string;
    effort?: string;
    type?: "ASSIGNMENT" | "EXAM" | "STUDY_GOAL";
}

export interface ParsedSyllabusItem {
    title: string;
    dueDate?: Date;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    subject?: string;
}

export class AIService {
    private model = genAI ? genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    }) : null;

    // Using flash-8b as fallback or same flash model as it has better limits/availability than pro-1.0
    private fallbackModel = genAI ? genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
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
    async parseTaskIntent(text: string): Promise<ParsedTaskIntent> {
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

        The input may be in Hinglish / Indian vernacular mixed with English. Normalize extracted meaning into clear English fields.
        Examples:
        - "kal 2 baje math mock test" => dueDate tomorrow 2 PM, subject Math, type EXAM
        - "is sunday physics rotational motion revise" => this Sunday task
        - "jaldi" / "urgent" => HIGH priority

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

        const normalizedText = lowerText
            .replace(/\bkal\b/g, 'tomorrow')
            .replace(/\baaj\b/g, 'today')
            .replace(/\bparso\b/g, 'day after tomorrow')
            .replace(/\biss?\s+raviwaar\b/g, 'this sunday')
            .replace(/\bagle\s+hafte\b/g, 'next week')
            .replace(/\bjaldi\b/g, 'urgent')
            .replace(/\bdopahar\b/g, 'afternoon')
            .replace(/\bshaam\b/g, 'evening')
            .replace(/\braat\b/g, 'night');

        // Priority Detection
        const isHighPriority = /urgent|important|high priority|asap|critical/.test(normalizedText);
        const isLowPriority = /low priority|trivial|minor|whenever/.test(normalizedText);

        // Type Detection
        const isExam = /exam|test|midterm|final|quiz|mock/.test(normalizedText);
        const isStudy = /study|read|revise|review|learn/.test(normalizedText);

        // Subject Detection (Basic List)
        const subjects = ["math", "mathematics", "physics", "chemistry", "biology", "history", "english", "literature", "geography", "science", "coding", "programming", "cs", "computer science", "spanish", "french"];
        const foundSubject = subjects.find(s => normalizedText.includes(s));
        const formattedSubject = foundSubject ? foundSubject.charAt(0).toUpperCase() + foundSubject.slice(1) : undefined;

        // Effort Detection
        const effortRegex = /(\d+)\s*(h|hr|hours?|m|min|minutes?)/i;
        const effortMatch = text.match(effortRegex);
        let effort: string | undefined;
        if (effortMatch) {
            const amount = effortMatch[1];
            const unit = effortMatch[2]?.toLowerCase();
            if (amount) {
                effort = `${amount}${unit?.startsWith("h") ? "h" : "m"}`;
            }
        }

        // Date & Time Detection
        let dueDate: Date | undefined = undefined;
        const now = new Date();

        // "Tomorrow", "Today"
        if (normalizedText.includes("tomorrow")) {
            dueDate = new Date(now);
            dueDate.setDate(now.getDate() + 1);
        } else if (normalizedText.includes("today")) {
            dueDate = new Date(now);
        } else if (normalizedText.includes("day after tomorrow")) {
            dueDate = new Date(now);
            dueDate.setDate(now.getDate() + 2);
        }

        // "Next [Day]" or "This [Day]" logic
        if (!dueDate) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayRegex = new RegExp(`(this|next)?\\s*(${days.join('|')})`, 'i');
            const dayMatch = normalizedText.match(dayRegex);

            if (dayMatch) {
                const modifier = dayMatch[1]; // "this" or "next"
                const dayName = dayMatch[2];
                if (dayName) {
                    const dayIndex = days.indexOf(dayName);
                    const currentDayIndex = now.getDay();

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
        const timeMatch = normalizedText.match(timeRegex);

        if (dueDate && timeMatch) {
            const hourMatch = timeMatch[1];
            if (!hourMatch) {
                dueDate.setHours(23, 59, 0, 0);
            } else {
                let hours = parseInt(hourMatch, 10);
                const minutes = parseInt(timeMatch[2] || "0");
                const meridiem = timeMatch[3];

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
     * Parses assignments/exams from a syllabus image.
     */
    async scanSyllabusImage(imageBase64: string, mimeType: string): Promise<ParsedSyllabusItem[]> {
        if (!this.model) {
            return [];
        }

        const prompt = `
        You are an academic planning assistant.
        Read this syllabus image and extract assignment/exam/study milestones into a JSON array.
        Each item must include:
        - title (string, required)
        - dueDate (ISO 8601 string, optional)
        - priority ("LOW" | "MEDIUM" | "HIGH", optional)
        - subject (string, optional)

        Rules:
        - Keep only actionable study items.
        - If date appears without year, assume current year ${new Date().getFullYear()}.
        - Return ONLY valid JSON array.
        `;

        try {
            const result = await this.model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: mimeType || "image/jpeg",
                    },
                },
            ]);
            const response = await result.response;
            const textResponse = response.text();

            const start = textResponse.indexOf("[");
            const end = textResponse.lastIndexOf("]");
            if (start === -1 || end === -1) {
                return [];
            }

            const parsed = JSON.parse(textResponse.slice(start, end + 1));
            if (!Array.isArray(parsed)) {
                return [];
            }

            const normalized: ParsedSyllabusItem[] = [];
            for (const item of parsed) {
                if (!item || typeof item !== "object") continue;
                const record = item as Record<string, unknown>;

                const title = typeof record.title === "string" ? record.title.trim() : "";
                if (!title) continue;

                const priority = record.priority;
                const safePriority =
                    priority === "HIGH" || priority === "MEDIUM" || priority === "LOW"
                        ? priority
                        : undefined;

                const dueDate =
                    typeof record.dueDate === "string" && record.dueDate.trim()
                        ? new Date(record.dueDate)
                        : undefined;

                const normalizedItem: ParsedSyllabusItem = { title };
                if (dueDate && !Number.isNaN(dueDate.getTime())) {
                    normalizedItem.dueDate = dueDate;
                }
                if (safePriority) {
                    normalizedItem.priority = safePriority;
                }
                if (typeof record.subject === "string" && record.subject.trim()) {
                    normalizedItem.subject = record.subject.trim();
                }

                normalized.push(normalizedItem);
            }

            return normalized.slice(0, 40);
        } catch (error) {
            console.warn("⚠️ Syllabus image scan failed:", error);
            return [];
        }
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
