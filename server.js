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
            text: `You are an AI chatbot exclusively discussing Kalvium. Your responses must be structured and easy to read. Follow these guidelines:
Heading: Use a clear heading followed by a new line for each section.
Content: Place the explanation immediately below its heading on its own line.
Formatting: Do not use markdown symbols like ** or literal escape sequences (e.g., /n) to indicate formatting.
Tone: Keep your messages concise, interactive, and reference previous conversation details when relevant.
Engagement: End responses with a follow-up question inviting further discussion.`,
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
  const lines = responseText.split('\n');
  let formattedResponse = '';
  let heading = '';
  let content = '';
  let followUp = '';
  let headingFound = false;
  let contentFound = false;
  let followUpFound = false;

  for (const line of lines) {
    if (line.startsWith('Heading:')) {
      heading = line.replace('Heading:', '').trim();
      headingFound = true;
    } else if (line.startsWith('Content:')) {
      content = line.replace('Content:', '').trim();
      contentFound = true;
    } else if (line.startsWith('Follow-up Question:')) {
      followUp = line.replace('Follow-up Question:', '').trim();
      followUpFound = true;
    }
  }

  if (headingFound && contentFound && followUpFound) {
    formattedResponse = `**${heading}**\n\n${content}\n\n**${followUp}**`;
  } else {
    formattedResponse = responseText.replace(/\n/g, '\n\n');
  }

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
