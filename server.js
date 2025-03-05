// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors()); // Enable CORS for cross-origin requests

// AI Model Configuration
const API_KEY = process.env.API_KEY || "AIzaSyAyi6M2FSTNcc7Uvm9LFSpWk2nBhBIGXaQ";
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

    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 65536,
      responseMimeType: "text/plain",
    };

    // Retrieve or initialize user chat history
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, [
        {
          role: "user",
          parts: [{ text: "You are an AI chatbot which only talks about Kalvium." }],
        },
        {
          role: "model",
          parts: [{ text: "Hello there! 👋 Are you interested in learning more about Kalvium? I'm happy to tell you all about it! 😊" }],
        },
      ]);
    }

    const chatHistory = chatHistories.get(userId);
    chatHistory.push({ role: "user", parts: [{ text: userInput }] });

    // Start chat with existing history
    const chat = model.startChat({
      generationConfig,
      history: chatHistory,
    });

    const result = await chat.sendMessage(userInput);
    const responseText = result.response.text();

    // Store AI response in chat history
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    return responseText;
  } catch (err) {
    console.error("❌ Error in AI response:", err);
    return "Sorry, I'm having trouble processing your request. Please try again later.";
  }
}

// Routes
app.get('/', (req, res) => {
  res.send("🌍 Welcome to the Kalvium Chatbot API!");
});

// Chat Endpoint
app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body?.userInput;
    const userId = req.ip; // Track users by IP (or replace with a session ID if available)

    console.log(`📩 New chat request from ${userId}:`, userInput);

    if (!userInput) {
      return res.status(400).json({ error: 'Invalid request body' });
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