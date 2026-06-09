import "dotenv/config";
import { InferenceClient } from "@huggingface/inference";
import { SYSTEM_PROMPT, TITLE_PROMPT } from "../utils/prompt.js";
import { LLM_CACHE_TTL, TITLE_CACHE_TTL } from "../utils/constants.js";
import { normalise, redisGet, redisSet } from "../utils/cache.js";

const hf = new InferenceClient(process.env.HUGGINGFACEHUB_API_KEY);
const MODEL = "Qwen/Qwen2.5-7B-Instruct";

function formatTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

async function callLLM(prompt: string, maxTokens: number): Promise<string> {
    const response = await hf.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.2,
    });
    return (response.choices[0].message.content ?? "").trim();
}


export const generateReply = async (
    history: { sender: string; text: string }[],
    userMessage: string
): Promise<string> => {
    try {
        // Only cache first-message FAQ queries — follow-ups depend on conversation context
        const isFirstMessage = history.length === 0;
        const key = `llm:reply:${normalise(userMessage)}`;

        if (isFirstMessage) {
            const cached = await redisGet(key);
            if (cached) {
                console.log(`[redis cache hit] reply for: "${userMessage.slice(0, 50)}"`);
                return cached;
            }
        }

        const formattedHistory = history
            .map((msg) => `${msg.sender === "ai" ? "Assistant" : "User"}: ${msg.text}`)
            .join("\n");

        const prompt = formatTemplate(SYSTEM_PROMPT, { history: formattedHistory, userMessage });

        const reply = await callLLM(prompt, 250);

        if (isFirstMessage) {
            await redisSet(key, reply, LLM_CACHE_TTL);
        }

        return reply;
    } catch (error) {
        console.error("LLM Service Error:", error);
        throw new Error("I am currently experiencing high traffic. Please try again in a moment.");
    }
};

export const generateTitle = async (userMessage: string): Promise<string> => {
    try {
        const key = `llm:title:${normalise(userMessage)}`;

        const cached = await redisGet(key);
        if (cached) return cached;

        const prompt = formatTemplate(TITLE_PROMPT, { userMessage });

        const title = (await callLLM(prompt, 20)).replace(/^"|"$/g, "");

        await redisSet(key, title, TITLE_CACHE_TTL);
        return title;
    } catch (error) {
        console.error("Title Gen Error:", error);
        return "New Chat";
    }
};