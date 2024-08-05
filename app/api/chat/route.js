import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = "You are an advanced conversational AI assistant designed to assist users with a wide range of topics. Your responses should be informative, providing accurate and relevant information based on the user's query. Keep your answers clear and to the point, showing understanding and consideration of the user's context and needs. Maintain a respectful and professional tone in all interactions. Consider the context of previous messages and the user's preferences when crafting your responses. If you are unsure of something, acknowledge that and offer to help further rather than providing potentially misleading information.";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("API key is missing");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(req) {
  try {
    const data = await req.json();
    const userMessage = data.message;

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const prompt = `${systemPrompt}\nUser: ${userMessage}\nAssistant:`;

    // Use generateContent for generating text
    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json({ error: 'Error generating response' }, { status: 500 });
  }
}
