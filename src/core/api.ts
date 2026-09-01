/**
 * src/core/api.ts
 * Handles all AI requests (send prompt, receive response, streaming)
 */

import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const envPath = path.join(projectRoot, "/.env");
dotenv.config({ path: envPath });

const apiKey: any = process.env.API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const api = axios.create({
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    headers: {
        "Content-Type": "application/json",
    },
});

export const sendToApi = async (prompt: string) => {
    try {
        const res = await api.post(
            `/models/${model}:generateContent`,
            {
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
            },
            {
                params: { key: apiKey },
            }
        );

        return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const message = error.response?.data?.error?.message || error.message;

            if (status === 429) {
                throw new Error("Rate limit exceeded. Please wait a moment and try again.");
            }

            throw new Error(`AI API Error (${status || 'Network'}): ${message}`);
        }

        throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
}