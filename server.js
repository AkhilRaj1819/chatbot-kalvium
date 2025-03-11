equire('dotenv').config();
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

// Exit if the API key is missing or still set to the default placeholder.
if (!API_KEY || API_KEY === "YOUR_API_KEY") {
    console.error("❌ API_KEY is missing. Please set it in the .env file.");
    process.exit(1);
}

// Use an in-memory Map to store a unique chat history for each user.
const chatHistories = new Map();

async function runChat(userInput, userId, username) {
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

        // If this user doesn't have an existing chat history, create one.
        if (!chatHistories.has(userId)) {
            chatHistories.set(userId, [
                {
                    role: "user",
                    parts: [{
                        text: `You are an AI chatbot exclusively discussing Kalvium. Your responses must be *highly structured and extremely easy to read*. Follow these guidelines strictly:

### **Structure and Formatting (Use Markdown)**
1. **Numbered Lists:** Use numbered lists (1., 2., 3., …) for steps or processes.
2. **Clear Headings:** Start each section with a **bolded heading** in Markdown (e.g., **Heading Name**) followed by a newline.
3. **Content under Headings:** Place the explanation immediately below its heading on its own line.
4. **Separate Sections:** Use clear visual breaks (like double newlines) to separate sections.
5. **Links and URLs:** Format links using Markdown like [Link Text](URL).
6. **Images:** Use Markdown for images like ![Image Alt Text](Image URL). If direct URLs aren't available, guide users to where they can find images.

### **Tone and Engagement**
- Keep messages concise and interactive.
- Reference previous conversation details when relevant.
- End responses with a follow-up question to encourage further discussion.

Please base your answers on these guidelines.`,
                    }],
                },
                {
                    role: "model",
                    parts: [{
                        text: username
                          ? `Hello ${username}! I'm your Kalvium specialist. I've been designed to share insightful, structured insights about Kalvium. How familiar are you with it so far?`
                          : `Hello! I'm your Kalvium specialist. I've been designed to share insightful, structured insights about Kalvium. How familiar are you with it so far?`,
                    }],
                },
            ]);
        }

        // Retrieve and update the conversation history with the new user input.
        const chatHistory = chatHistories.get(userId);
        chatHistory.push({ role: "user", parts: [{ text: userInput }] });

        // Start the conversation using the history.
        const chat = model.startChat({ generationConfig, history: chatHistory });
        const result = await chat.sendMessage(userInput);
        const responseText = result.response.text();

        // Append the model's reply into the history.
        chatHistory.push({ role: "model", parts: [{ text: responseText }] });

        return formatResponse(responseText);
    } catch (err) {
        console.error("❌ Error in AI response:", err);
        return "I'm having trouble processing your request right now. Please try again later.";
    }
}

// Formats the response for better readability (useful for Markdown formatting).
function formatResponse(responseText) {
    return responseText.replace(/\n/g, '\n\n');
}

// Landing route.
app.get('/', (req, res) => {
    res.send("🌍 Welcome to the Kalvium Chatbot API! Ask me anything specific about Kalvium.");
});

// Chat endpoint.
app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body?.userInput;
        let userId = req.body?.userId;
        const username = req.body?.username;  // Optional username for personalization.

        // If no userId is provided, generate a new one and return it via header.
        if (!userId) {
            userId = uuidv4();
            console.log(`✨ New user ID generated: ${userId}`);
            res.setHeader('X-User-ID', userId);
        }

        console.log(`📩 Chat request from ${userId}:`, userInput);

        if (!userInput) {
            return res.status(400).json({ error: 'Invalid request: userInput is missing.' });
        }

        const response = await runChat(userInput, userId, username);
        res.json({ response });
    } catch (error) {
        console.error('❌ Error in chat endpoint:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server.
app.listen(port, () => {
    console.log(`🚀 Kalvium Chatbot API running on http://localhost:${port}`);
});