import fetch from 'node-fetch';

const WEATHER_CODES = {
  1000: 'Clear',
  1100: 'Mostly Clear',
  1101: 'Partly Cloudy',
  1102: 'Mostly Cloudy',
  1001: 'Cloudy',
  2000: 'Fog',
  4000: 'Drizzle',
  4001: 'Rain',
  4200: 'Light Rain',
  4201: 'Heavy Rain',
  5000: 'Snow',
  5001: 'Flurries',
  5100: 'Light Snow',
  5101: 'Heavy Snow',
  6000: 'Freezing Drizzle',
  6001: 'Freezing Rain',
  7000: 'Ice Pellets',
  8000: 'Thunderstorm'
};

async function fetchWeatherData(location, type = 'realtime') {
  const apiKey = process.env.TOMORROW_IO_API_KEY;
  
  if (!apiKey) {
    throw new Error('TOMORROW_IO_API_KEY is not configured');
  }

  // Clean the location string (remove words like 'today', 'tomorrow', etc.)
  const cleanLocation = location.replace(/(today|tomorrow|this week|forecast|weather)/gi, '').trim();
  const encodedLocation = encodeURIComponent(cleanLocation);

  let url;
  if (type === 'forecast') {
    url = `https://api.tomorrow.io/v4/weather/forecast?location=${encodedLocation}&apikey=${apiKey}&units=metric`;
  } else {
    url = `https://api.tomorrow.io/v4/weather/realtime?location=${encodedLocation}&apikey=${apiKey}&units=metric`;
  }

  console.log('Making API request to:', url.replace(apiKey, 'HIDDEN'));

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Weather API error response:', errorText);
    throw new Error(`Weather API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function weatherModel(location, type = 'realtime') {
  try {
    const data = await fetchWeatherData(location, type);

    if (type === 'forecast') {
      // Handle forecast data
      const dailyData = data.timelines.daily.slice(0, 7); // Get 7 days forecast
      const forecastText = dailyData.map(day => {
        const date = new Date(day.time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `${date}:
- Temperature: ${day.values.temperatureAvg}°C
- Conditions: ${WEATHER_CODES[day.values.weatherCodeMax] || 'Unknown'}
- Precipitation Chance: ${day.values.precipitationProbabilityAvg}%`;
      }).join('\n\n');

      return `Weather forecast for ${location}:\n${forecastText}`;
    } else {
      // Handle realtime data
      const values = data.data.values;
      const weatherDescription = WEATHER_CODES[values.weatherCode] || 'Unknown';

      return `Current weather in ${location}:
- Conditions: ${weatherDescription}
- Temperature: ${values.temperature.toFixed(1)}°C
- Wind Speed: ${values.windSpeed.toFixed(1)} m/s
- Humidity: ${values.humidity}%
- Chance of Precipitation: ${values.precipitationProbability}%`;
    }

  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
}

export default weatherModel;