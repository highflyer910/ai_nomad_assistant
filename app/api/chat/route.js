import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';
import weatherModel from '../../../weatherModel';

const systemPrompt = (language) => `
You are a friendly and knowledgeable travel assistant with access to real-time and forecast weather data.
Your responses should include:
1. Travel recommendations and hidden gems
2. Weather information when available (current or forecast)
3. Practical travel tips based on weather conditions

When weather data is provided, incorporate it naturally into your travel advice.
If no weather data is available, still provide travel information but mention that weather data couldn't be fetched.

Respond in ${language === 'es' ? 'Spanish' : language === 'it' ? 'Italian' : 'English'}.

Weather Info: {weatherInfo}
User Question: {userMessage}
`;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

function extractLocationAndType(message) {
  console.log('Analyzing message:', message);
  
  // Clean up the message
  const cleanMessage = message.toLowerCase().trim();
  
  // Determine if it's a forecast request
  const isForecast = cleanMessage.includes('forecast') || 
                    cleanMessage.includes('this week') || 
                    cleanMessage.includes('next week') ||
                    cleanMessage.includes('tomorrow');
  
  // Extract location patterns
  const patterns = [
    /(?:weather|forecast|temperature|current)\s+(?:in|for|at)\s+([A-Za-z\s,]+)/i,
    /(?:how(?:'s| is) the weather in)\s+([A-Za-z\s,]+)/i,
    /(?:what(?:'s| is) the weather like in)\s+([A-Za-z\s,]+)/i,
    /(?:visit|traveling to|going to)\s+([A-Za-z\s,]+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const location = match[1].trim();
      console.log('Found location:', location, 'Type:', isForecast ? 'forecast' : 'realtime');
      return { location, type: isForecast ? 'forecast' : 'realtime' };
    }
  }
  
  return { location: null, type: 'realtime' };
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { message: userMessage, language = 'en' } = data;

    if (!userMessage?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const { location, type } = extractLocationAndType(userMessage);
    let weatherInfo = null;

    if (location) {
      weatherInfo = await weatherModel(location, type);
    }

    const prompt = systemPrompt(language)
      .replace('{weatherInfo}', weatherInfo || 'Weather data is currently unavailable.')
      .replace('{userMessage}', userMessage);

    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    return NextResponse.json({ 
      message: response,
      weatherData: weatherInfo ? { location, info: weatherInfo, type } : null
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}