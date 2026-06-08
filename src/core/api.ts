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

const envPath = path.join(projectRoot, "/.env")

dotenv.config({
    path: envPath
});


const token: any = process.env.API_KEY
const url: any = process.env.API_URL

const api = axios.create({
    baseURL: url,
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
});

// export const sendToApi = async (prompt: string) => {
//     const response = await api.post("/chat/completions", {
//         model: "openrouter/free",
//         messages: [
//             {
//                 role: "user",
//                 content: prompt,
//             },
//         ],
//     });

//     return response.data.choices[0].message.content;
// };

export const sendToApi = async (prompt: string) => {


    try {
        const res = await api.post("/chat", {
            message: prompt,
        })

        return res.data?.response;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const message = error.response?.data?.error || error.message;

            if (status === 429) {
                throw new Error("Rate limit exceeded. Please wait a moment and try again.");
            }

            throw new Error(`AI API Error (${status || 'Network'}): ${message}`);
        }

        throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
}




