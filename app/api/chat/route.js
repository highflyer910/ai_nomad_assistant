import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import fetch from "node-fetch";

// Initialize Groq API client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE_URL = "http://api.weatherapi.com/v1";

const systemPrompt = (language) => `
You are a friendly and knowledgeable travel assistant, knowing all the secret places of the world.
Your responses should include:
1. Travel recommendations and hidden gems.
2. Weather information only if the user explicitly asks for it.
3. Practical travel tips based on the user's questions.

If the user greets you (e.g., "hi", "hello"), respond with a short and friendly offer to help, without mentioning weather or travel tips.

If the user requests weather information, incorporate it naturally into your response. If no weather data is available, still provide travel information but mention that weather data couldn't be fetched.

Respond in ${language === "es" ? "Spanish" : language === "it" ? "Italian" : "English"}.

Weather Info: {weatherInfo}
User Question: {userMessage}
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
      model: "mixtral-8x7b-32768",
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
