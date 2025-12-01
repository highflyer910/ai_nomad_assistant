import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE_URL = "http://api.weatherapi.com/v1";

const systemPrompt = (language) => `
You are a friendly, knowledgeable travel assistant specializing in unique, off-the-beaten-path destinations, authentic experiences and local hidden gems that tourists rarely discover.

When recommending places:
- Focus on local favorites, hidden spots, and authentic experiences
- Avoid obvious tourist traps unless specifically asked
- List minimum 5 spots with this format (no numbers):
  • Place Name – Why locals love it and what makes it special (2-3 engaging sentences)
  • Place Name – Another hidden gem description

Core Rules:
- No standard phrases like "Hello" or "Happy to help" after each message
- Only include weather when explicitly requested
- Keep responses natural and conversational
- No robotic closing phrases

Weather Info: {weatherInfo}
User Question: {userMessage}

Respond in ${language === "es" ? "Spanish" : language === "it" ? "Italian" : "English"}.
`;

async function fetchWeather(location, type) {
  try {
    const endpoint = type === "forecast" ? "forecast.json" : "current.json";
    const url = `${WEATHER_API_BASE_URL}/${endpoint}?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=3`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("Weather API error:", data.error.message);
      return null;
    }

    return type === "forecast" ? data.forecast.forecastday : data.current;
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return null;
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { message: userMessage, language = "en" } = data;

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY is not set");
      return NextResponse.json({ error: "API configuration error" }, { status: 500 });
    }

    const { location, type } = extractLocationAndType(userMessage);
    let weatherInfo = null;

    if (location) {
      weatherInfo = await fetchWeather(location, type);
    }

    const prompt = systemPrompt(language)
      .replace("{weatherInfo}", weatherInfo ? JSON.stringify(weatherInfo) : "Weather data is currently unavailable.")
      .replace("{userMessage}", userMessage);

    console.log("Prompt:", prompt); // Debug log

    // Call Google Generative AI API
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseMessage = response.text() || "Sorry, I couldn't generate a response.";

      console.log("Google AI Response successful"); // Debug log

      return NextResponse.json({
        message: responseMessage,
        weatherData: weatherInfo ? { location, info: weatherInfo, type } : null,
      });
    } catch (googleError) {
      console.error("Google AI API error:", googleError);
      return NextResponse.json({ 
        error: "Google AI API error", 
        details: googleError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ 
      error: "Failed to process request", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function extractLocationAndType(message) {
  console.log("Analyzing message:", message);

  const cleanMessage = message.toLowerCase().trim();
  const isForecast =
    cleanMessage.includes("forecast") ||
    cleanMessage.includes("this week") ||
    cleanMessage.includes("next week") ||
    cleanMessage.includes("tomorrow");

  const patterns = [
    /(?:weather|forecast|temperature|current)\s+(?:in|for|at)\s+([A-Za-z\s,]+)/i,
    /(?:how(?:'s| is) the weather in)\s+([A-Za-z\s,]+)/i,
    /(?:what(?:'s| is) the weather like in)\s+([A-Za-z\s,]+)/i,
    /(?:visit|traveling to|going to)\s+([A-Za-z\s,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const location = match[1].trim();
      console.log("Found location:", location, "Type:", isForecast ? "forecast" : "realtime");
      return { location, type: isForecast ? "forecast" : "realtime" };
    }
  }

  return { location: null, type: "realtime" };
}