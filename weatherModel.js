import fetch from 'node-fetch';

const apiKey = process.env.TOMORROW_IO_API_KEY;

const weatherModel = async (location) => {
  try {
    if (!location) return null;

    const encodedLocation = encodeURIComponent(location);
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${encodedLocation}&apikey=${apiKey}`;
    const options = { method: 'GET', headers: { accept: 'application/json' } };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!data || data.error) {
      console.error('Weather API error:', data?.error?.message || 'Unknown error');
      return `Could not retrieve weather data for ${location}.`;
    }

    const { temperature, weatherCode, windSpeed } = data.data.values;

    return `Current weather in ${location}: ${weatherCode}, temperature: ${temperature}°C, wind speed: ${windSpeed} m/s.`;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return 'An error occurred while fetching weather data.';
  }
};

export default weatherModel;
