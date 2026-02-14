
import { Mistral } from "@mistralai/mistralai";

const API_KEY = process.env.MISTRAL_API_KEY;

// Log warning if no key is provided
if (!API_KEY) {
    console.warn("⚠️ No MISTRAL_API_KEY found in environment variables. AI features will fail or use fallback.");
} else {
    console.log(`✅ AI Service initialized with Mistral key: ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
}

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
    private client = API_KEY ? new Mistral({ apiKey: API_KEY }) : null;

    // Primary model for Vision/Screenshots
    private modelIdentifier = "pixtral-12b-2409";

    // Specialized model for OCR/PDFs
    private ocrModelIdentifier = "mistral-ocr-latest";

    // Text-only model for parsing and subtask generation
    private textModelIdentifier = "open-mistral-nemo"; // Reliable, fast, and widely available

    /**
     * Parses raw text to extract task metadata using Mistral.
     */
    async parseTaskIntent(text: string): Promise<ParsedTaskIntent> {
        if (!this.client) {
            console.warn("⚠️ AI Service not initialized (missing key). Using fallback.");
            return this.fallbackParse(text);
        }

        const today = new Date();
        const prompt = `
        You are a smart planner assistant. Parse the following text into a JSON object with keys: 
        - title (string, extract the core task name only, remove dates/times)
        - description (string, optional)
        - dueDate (ISO 8601 string, optional. Base it on the reference date below.)
        - priority (LOW, MEDIUM, HIGH)
        - subject (string, optional, inferred from context like "Math", "History")
        - effort (string, optional, use values like "15m", "30m", "1h", "2h", "4h+" based on context)
        - type (ASSIGNMENT, EXAM, STUDY_GOAL. Default to ASSIGNMENT if unclear, EXAM if "test" or "exam" mentioned)

        Reference Date: ${today.toISOString()} (${today.toLocaleDateString('en-US', { weekday: 'long' })})
        
        The input may be in Hinglish / Indian vernacular mixed with English. Normalize extracted meaning into clear English fields.
        Examples:
        - "kal 2 baje math mock test" => title: "Math Mock Test", dueDate tomorrow 2 PM, subject Math, type EXAM
        - "is sunday physics rotational motion revise" => title: "Revise Rotational Motion", this Sunday task
        - "jaldi" / "urgent" => HIGH priority

        Text to parse: "${text}"
        
        Return ONLY valid JSON.
        `;

        try {
            return await this.generateWithModel(this.textModelIdentifier, prompt, text);
        } catch (error) {
            console.warn("⚠️ Primary AI model failed:", error);
            try {
                return await this.generateWithModel(this.textModelIdentifier, prompt, text);
            } catch (fallbackError) {
                console.warn("⚠️ AI Service failed completely:", fallbackError);
                return this.fallbackParse(text);
            }
        }
    }

    private cleanTitle(text: string): string {
        let clean = text;
        const remove = (regex: RegExp) => { clean = clean.replace(regex, '').replace(/\s+/g, ' ').trim(); };

        // Remove date terms (global, case-insensitive)
        remove(/\b(tomorrow|today|day after tomorrow|next week|this sunday|next monday|next tuesday|next wednesday|next thursday|next friday|next saturday|next sunday)\b/gi);
        remove(/\b(kal|aaj|parso|agle hafte)\b/gi);

        // Remove priority terms
        remove(/\b(urgent|important|high priority|asap|critical|low priority|trivial|minor|whenever)\b/gi);
        remove(/\b(jaldi|dheere)\b/gi);

        // Remove time terms (at 5pm, by 2:00, 3pm, etc)
        // Matches: "at 5pm", "by 2:00pm", "3pm", "14:00"
        remove(/(?:at|by|due)?\s*\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi);

        // Remove "due [date]" patterns like "due 12", "due on monday"
        remove(/\bdue\s+(?:on\s+)?(?:[a-z0-9]+)\b/gi);

        return clean;
    }

    private async generateWithModel(model: string, prompt: string, originalText: string) {
        if (!this.client) throw new Error("AI client not initialized");

        try {
            const result = await this.client.chat.complete({
                model,
                messages: [{ role: "user", content: prompt }],
            });

            const textResponse = result.choices?.[0]?.message?.content;
            if (!textResponse || typeof textResponse !== "string") {
                throw new Error("Empty response from AI model");
            }

            // console.log(`[AI] Response for "${originalText}":`, textResponse); // OPTIONAL DEBUG

            // Robust JSON extraction: look for the first '{' and the last '}'
            const jsonStart = textResponse.indexOf('{');
            const jsonEnd = textResponse.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("No JSON found in response");
            }

            const jsonString = textResponse.substring(jsonStart, jsonEnd + 1);
            const data = JSON.parse(jsonString);

            // Post-process title: if AI just returned the whole text, try to clean it
            let title = data.title || originalText;
            if (title.toLowerCase() === originalText.toLowerCase() || title.length > originalText.length * 0.8) {
                const cleaned = this.cleanTitle(title);
                if (cleaned.length < title.length) title = cleaned;
            }

            return {
                title,
                description: data.description,
                priority: data.priority,
                type: data.type,
                subject: data.subject,
                effort: data.effort,
                ...(data.dueDate && { dueDate: new Date(data.dueDate) })
            };
        } catch (err: any) {
            console.error(`[AI] generateWithModel error:`, err);
            throw err;
        }
    }

    private fallbackParse(text: string) {
        // Advanced Heuristic Parsing Fallback
        const lowerText = text.toLowerCase();

        // Use the centralized cleaner for the title
        const cleanTitle = this.cleanTitle(text);

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
        // Don't necessarily remove 'exam' from title as it might be part of the name "Math Exam"

        const isStudy = /study|read|revise|review|learn/.test(normalizedText);

        // Subject Detection (Basic List)
        const subjects = ["math", "mathematics", "physics", "chemistry", "biology", "history", "english", "literature", "geography", "science", "coding", "programming", "cs", "computer science", "spanish", "french"];
        const foundSubject = subjects.find(s => normalizedText.includes(s));
        const formattedSubject = foundSubject ? foundSubject.charAt(0).toUpperCase() + foundSubject.slice(1) : undefined;
        // Keep subject in title usually

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

        // Regex for stripping common date terms
        const dateTermsRegex = /\b(tomorrow|today|day after tomorrow|next week|this sunday|next monday|next tuesday|next wednesday|next thursday|next friday|next saturday|next sunday)\b/gi;

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
                    if (daysToAdd === 0 && !modifier) daysToAdd = 7;
                    if (modifier === 'next') daysToAdd += 7;

                    dueDate = new Date(now);
                    dueDate.setDate(now.getDate() + daysToAdd);
                }
            }
        }

        // Time Detection (e.g., "at 5pm", "by 14:00", "3pm")
        const timeRegex = /(?:at|by|due)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
        // Also simple "3pm" without "at/by"
        const simpleTimeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

        let timeMatch = normalizedText.match(timeRegex) || normalizedText.match(simpleTimeRegex);

        if (timeMatch) {
            if (dueDate) {
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
            }
        } else if (dueDate) {
            // Default to end of day if no time specified
            dueDate.setHours(23, 59, 0, 0);
        }

        const result: any = {
            title: cleanTitle || text, // Use cleaned title
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
     * Parses assignments/exams from a syllabus image using Pixtral vision model.
     */
    async scanSyllabusImage(imageBase64: string, mimeType: string): Promise<ParsedSyllabusItem[]> {
        if (!this.client) {
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
        - Extract ALL topics, chapters, assignments, or exam dates found.
        - If it looks like a list of topics, treat them as study items.
        - If date appears without year, assume current year ${new Date().getFullYear()}.
        - Return ONLY valid JSON array.
        `;

        try {
            // Ensure the base64 string has the data URL prefix for Mistral
            let imageUrl = imageBase64;
            if (!imageBase64.startsWith('data:')) {
                imageUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
            }

            let attempt = 0;
            const maxRetries = 3;
            let result;

            while (attempt < maxRetries) {
                try {
                    result = await this.client.chat.complete({
                        model: this.modelIdentifier,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: prompt },
                                    {
                                        type: "image_url",
                                        imageUrl: imageUrl,
                                    },
                                ],
                            },
                        ],
                    });
                    break; // Success
                } catch (err: any) {
                    const status = err.status || err.statusCode || err.response?.status;
                    if (status === 429 || status === 503) {
                        attempt++;
                        console.warn(`⚠️ Mistral Rate Limit (${status}). Retrying attempt ${attempt}/${maxRetries} in ${5 * attempt}s...`);
                        if (attempt >= maxRetries) throw err;
                        await new Promise(res => setTimeout(res, 5000 * Math.pow(2, attempt - 1)));
                    } else {
                        throw err;
                    }
                }
            }

            if (!result) throw new Error("Failed to get response after retries");

            const textResponse = result.choices?.[0]?.message?.content;
            if (!textResponse || typeof textResponse !== "string") {
                console.warn("⚠️ Empty response from Mistral vision model");
                return [];
            }

            console.log("🔍 Raw AI Response:", textResponse);

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
        if (!this.client) {
            return this.fallbackSubtasks(taskTitle);
        }

        const prompt = `
        Break down the following academic task into 3-5 distinct, actionable subtasks (approx 20 mins each).
        Return ONLY a JSON array of strings.

        Task: ${taskTitle}
        Details: ${description || "N/A"}
        `;

        try {
            return await this.generateSubtasksWithModel(this.textModelIdentifier, prompt);
        } catch (error) {
            console.warn("⚠️ Primary AI model failed for subtasks:", error);
            try {
                return await this.generateSubtasksWithModel(this.textModelIdentifier, prompt);
            } catch (fallbackError) {
                console.warn("⚠️ AI Subtasks failed completely. Returning generic steps.");
                return this.fallbackSubtasks(taskTitle);
            }
        }
    }

    private async generateSubtasksWithModel(model: string, prompt: string): Promise<string[]> {
        if (!this.client) throw new Error("AI client not initialized");

        const result = await this.client.chat.complete({
            model,
            messages: [{ role: "user", content: prompt }],
        });

        const textResponse = result.choices?.[0]?.message?.content;
        if (!textResponse || typeof textResponse !== "string") {
            throw new Error("Empty response from AI model");
        }

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
