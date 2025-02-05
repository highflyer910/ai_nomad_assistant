import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import fetch from "node-fetch";

// Initialize Groq API client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE_URL = "http://api.weatherapi.com/v1";

const systemPrompt = (language) => `
You are a fun, friendly, and insanely knowledgeable travel assistant—like that cool friend who knows all the secret spots and best street food in every country.

Response Style:  
- For greetings (hi, hello), respond only with a friendly greeting and: "Which destination would you like to explore?", nothing more.
- For specific destination questions, structure your response as:
  1. Direct answer to their question
  2. If mentioning places, list minimum of 5 cool spots as follows and make it non-numbered:
     • Place Name – Quick, interesting fact (2-3 fun sentences)
     • Place Name – Another cool spot description

Core Rules:
- No standard phrases like "Hello" or "Happy to help" after each message
- No random country facts unless specifically asked
- Only include weather when explicitly requested
- Answer exactly what was asked—nothing more
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

    const { location, type } = extractLocationAndType(userMessage);
    let weatherInfo = null;

    if (location) {
      weatherInfo = await fetchWeather(location, type);
    }

    const prompt = systemPrompt(language)
      .replace("{weatherInfo}", weatherInfo ? JSON.stringify(weatherInfo) : "Weather data is currently unavailable.")
      .replace("{userMessage}", userMessage);

    // Call Groq AI API using SDK
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseMessage = chatCompletion.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return NextResponse.json({
      message: responseMessage,
      weatherData: weatherInfo ? { location, info: weatherInfo, type } : null,
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "Failed to process request", details: error.message }, { status: 500 });
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
