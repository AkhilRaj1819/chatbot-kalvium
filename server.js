require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 4000;

// Middleware setup
app.use(express.json());
app.use(cors({
  // Adjust these options based on your deployment needs.
  credentials: true,
  origin: true,
}));
app.use(cookieParser());

const API_KEY = process.env.API_KEY || "YOUR_API_KEY"; // Replace with your API key!
const MODEL_NAME = "gemini-2.0-flash-thinking-exp-01-21";

// Exit if the API key is missing or still set to the default placeholder.
if (!API_KEY || API_KEY === "YOUR_API_KEY") {
  console.error("❌ API_KEY is missing. Please set it in the .env file.");
  process.exit(1);
}

// In-memory storage for unique chat histories per user.
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

    // Initialize a new chat history for this user if none exists.
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
              ? `Hello ${username}! I'm your Kalvium specialist. How familiar are you with it so far?`
              : `Hello! I'm your Kalvium specialist. How familiar are you with Kalvium so far?`,
          }],
        },
      ]);
    }

    // Retrieve and update the conversation history with the new user input.
    const chatHistory = chatHistories.get(userId);
    chatHistory.push({ role: "user", parts: [{ text: userInput }] });

    // Start the conversation with the AI using the accumulated history.
    const chat = model.startChat({ generationConfig, history: chatHistory });
    const result = await chat.sendMessage(userInput);
    const responseText = result.response.text();

    // Append the AI's response to the chat history.
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    return formatResponse(responseText);
  } catch (err) {
    console.error("❌ Error in AI response:", err);
    return "I'm having trouble processing your request right now. Please try again later.";
  }
}

// Formats responses by converting single to double newlines (for better Markdown formatting).
function formatResponse(responseText) {
  return responseText.replace(/\n/g, '\n\n');
}

app.get('/', (req, res) => {
  res.send("🌍 Welcome to the Kalvium Chatbot API! Ask me anything specific about Kalvium.");
});

app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body?.userInput;
    const username = req.body?.username;  // Optional for personalization.
   
    // Retrieve the userId from cookies (or fall back to req.body.userId if sent).
    let userId = req.cookies.userId || req.body?.userId;

    // Generate and set a new userId cookie if it's not available.
    if (!userId) {
      userId = uuidv4();
      res.cookie('userId', userId, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
      console.log(`✨ New user ID generated: ${userId}`);
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

app.listen(port, () => {
  console.log(`🚀 Kalvium Chatbot API running on http://localhost:${port}`);
});