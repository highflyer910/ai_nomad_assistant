import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = "You are a travel expert specializing in off-the-beaten-path destinations. Provide detailed and interesting recommendations for unique travel experiences.";

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
