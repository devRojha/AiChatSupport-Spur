import "dotenv/config";
import { InferenceClient } from "@huggingface/inference";
import { SYSTEM_PROMPT, TITLE_PROMPT } from "../utils/prompt.js";

const hf = new InferenceClient(process.env.HUGGINGFACEHUB_API_KEY);
const MODEL = "Qwen/Qwen2.5-7B-Instruct";

function formatTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export const generateReply = async (
    history: { sender: string; text: string }[],
    userMessage: string
): Promise<string> => {
    try {
        const formattedHistory = history
            .map((msg) => `${msg.sender === "ai" ? "Assistant" : "User"}: ${msg.text}`)
            .join("\n");

        const prompt = formatTemplate(SYSTEM_PROMPT, { history: formattedHistory, userMessage });

        const response = await hf.chatCompletion({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 250,
            temperature: 0.2,
        });

        return (response.choices[0].message.content ?? "").trim();
    } catch (error) {
        console.error("LLM Service Error:", error);
        throw new Error("I am currently experiencing high traffic. Please try again in a moment.");
    }
};

export const generateTitle = async (userMessage: string): Promise<string> => {
    try {
        const prompt = formatTemplate(TITLE_PROMPT, { userMessage });

        const response = await hf.chatCompletion({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 20,
            temperature: 0.2,
        });

        return (response.choices[0].message.content ?? "New Chat").trim().replace(/^"|"$/g, "");
    } catch (error) {
        console.error("Title Gen Error:", error);
        return "New Chat";
    }
};