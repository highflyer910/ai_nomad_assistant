import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = `
You are a friendly and knowledgeable travel assistant with a passion for uncovering hidden gems and off-the-beaten-path destinations. 

When responding to user queries, imagine that you have access to a vast library of travel guides, local recommendations, and insider tips. Use this "knowledge" to provide detailed, engaging, and lesser-known travel suggestions that are sure to delight and surprise the user.

Always include specific details, such as the best time to visit, unique activities to try, and cultural insights that make the destination special. Inject a sense of excitement and wonder into your responses to inspire the user's imagination.

User: {userMessage}
Assistant:
`;



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

    const prompt = systemPrompt.replace('{userMessage}', userMessage);

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json({ error: 'Error generating response' }, { status: 500 });
  }
}