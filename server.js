// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors()); // Enable CORS for cross-origin requests

// AI Model Configuration
const API_KEY = process.env.API_KEY || "YOUR_API_KEY";
const MODEL_NAME = "gemini-2.0-flash-thinking-exp-01-21";

if (!API_KEY) {
    console.error("❌ API_KEY is missing. Please set it in the .env file.");
    process.exit(1);
}

// Store chat history per user
const chatHistories = new Map();

// Function to handle AI responses with chat history
async function runChat(userInput, userId) {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Generation configuration tuned for concise and structured output.
        const generationConfig = {
            temperature: 0.7,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 65536,
            responseMimeType: "text/plain",
        };

        // Initialize or retrieve user chat history with detailed format instructions
        if (!chatHistories.has(userId)) {
            chatHistories.set(userId, [
                {
                    role: "user",
                    parts: [{
                        text: `You are an AI chatbot exclusively discussing Kalvium. Your responses must be **highly structured and extremely easy to read**. Follow these guidelines strictly:

**Structure and Formatting (Use Markdown):**

1.  **Numbered Lists:** Use numbered lists (1., 2., 3., ...) for steps, processes, or items in a sequence.
2.  **Clear Headings:**  Start each section with a **bolded heading** in Markdown (e.g., \`### **Heading Name** ###\`) followed by a newline.
3.  **Content under Headings:** Place the explanation or content immediately below its heading on its own line.
4.  **Separate Sections:** Use clear visual breaks (like double newlines) to separate different sections of your response.
5.  **Links and URLs (Markdown):** If relevant, include valid URLs or links to official Kalvium resources. Format links using Markdown like \`[Link Text](URL)\`.
6.  **Images (Markdown):** If helpful, try to include image URLs using Markdown like \`![Image Alt Text](Image URL)\`. If direct image URLs aren't available, guide users to where they can find images on the Kalvium website.

**Tone and Engagement:**

*   Keep your messages concise and interactive.
*   Reference previous conversation details when relevant.
*   End responses with a follow-up question to encourage further discussion.

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

        // Add the current user input to the chat history
        const chatHistory = chatHistories.get(userId);
        chatHistory.push({
            role: "user",
            parts: [{ text: userInput }],
        });

        // Start chat with the preserved chat history for context and reference
        const chat = model.startChat({
            generationConfig,
            history: chatHistory,
        });

        const result = await chat.sendMessage(userInput);
        let responseText = result.response.text();

        // Store the AI's response based on conversation context
        chatHistory.push({
            role: "model",
            parts: [{ text: responseText }],
        });

        return formatResponse(responseText);
    } catch (err) {
        console.error("❌ Error in AI response:", err);
        return "I'm having trouble processing your request right now. Please try again later.";
    }
}

function formatResponse(responseText) {
    // Basic formatting: replace single newlines with double newlines for spacing
    formattedResponse = responseText.replace(/\n/g, '\n\n');
    return formattedResponse;
}

// Routes
app.get('/', (req, res) => {
    res.send("🌍 Welcome to the Kalvium Chatbot API! Ask me anything specific about Kalvium.");
});

// Chat Endpoint
app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body?.userInput;
        const userId = req.ip; // Identify users by IP (or replace with a session ID if available)

        console.log(`📩 New chat request from ${userId}:`, userInput);

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

// Start Server
app.listen(port, () => {
    console.log(`🚀 Kalvium Chatbot API running on http://localhost:${port}`);
});
