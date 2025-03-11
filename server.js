require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const API_KEY = process.env.API_KEY || "YOUR_API_KEY"; // Replace with your API key!
const MODEL_NAME = "gemini-2.0-flash-thinking-exp-01-21";

if (!API_KEY) {
    console.error("❌ API_KEY is missing. Please set it in the .env file.");
    process.exit(1);
}

const chatHistories = new Map();

async function runChat(userInput, userId) {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const generationConfig = {
            temperature: 0.7,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 65536,
            responseMimeType: "text/plain",
        };

        if (!chatHistories.has(userId)) {
            chatHistories.set(userId, [
                {
                    role: "user",
                    parts: [{
                        text: `You are an AI chatbot exclusively discussing Kalvium. Your responses must be **highly structured and extremely easy to read**. Follow these guidelines strictly:

**Structure and Formatting (Use Markdown):**

1.  **Numbered Lists:** Use numbered lists (1., 2., 3., ...) for steps, processes, or items in a sequence.
2.  **Clear Headings:** Start each section with a **bolded heading** in Markdown (e.g., \`### **Heading Name** ###\`) followed by a newline.
3.  **Content under Headings:** Place the explanation or content immediately below its heading on its own line.
4.  **Separate Sections:** Use clear visual breaks (like double newlines) to separate different sections of your response.
5.  **Links and URLs (Markdown):** If relevant, include valid URLs or links to official Kalvium resources. Format links using Markdown like \`[Link Text](URL)\`.
6.  **Images (Markdown):** If helpful, try to include image URLs using Markdown like \`![Image Alt Text](Image URL)\`. If direct image URLs aren't available, guide users to where they can find images on the Kalvium website.

**Tone and Engagement:**

* Keep your messages concise and interactive.
* Reference previous conversation details when relevant.
* End responses with a follow-up question to encourage further discussion.

Your goal is to make the information about Kalvium as clear, organized, and accessible as possible through structured formatting.  Make sure to use Markdown for all formatting elements (bold headings, lists, links, images).`,
                    }],
                },
                {
                    role: "model",
                    parts: [{
                        text: `Hello! I'm your Kalvium specialist. I've been designed to share insightful, structured insights about Kalvium. How familiar are you with it so far?`,
                    }],
                },
            ]);
        }

        const chatHistory = chatHistories.get(userId);
        chatHistory.push({ role: "user", parts: [{ text: userInput }] });

        const chat = model.startChat({ generationConfig, history: chatHistory });
        const result = await chat.sendMessage(userInput);
        const responseText = result.response.text();

        chatHistory.push({ role: "model", parts: [{ text: responseText }] });

        return formatResponse(responseText);
    } catch (err) {
        console.error("❌ Error in AI response:", err);
        return "I'm having trouble processing your request right now. Please try again later.";
    }
}

function formatResponse(responseText) {
    return responseText.replace(/\n/g, '\n\n');
}

app.get('/', (req, res) => {
    res.send("🌍 Welcome to the Kalvium Chatbot API! Ask me anything specific about Kalvium.");
});

app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body?.userInput;
        let userId = req.body?.userId;

        if (!userId) {
            userId = uuidv4();
            console.log(`✨ New user ID generated: ${userId}`);
            res.setHeader('X-User-ID', userId);
        }

        console.log(`📩 Chat request from ${userId}:`, userInput);

        if (!userInput) {
            return res.status(400).json({ error: 'Invalid request: userInput is missing.' });
        }

        const response = await runChat(userInput, userId);
        res.json({ response });
    } catch (error) {
        console.error('❌ Error in chat endpoint:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Kalvium Chatbot API running on http://localhost:${port}`);
});