import React, { useState, useEffect } from 'react';
import { MapPin, Thermometer, Wind, Droplets, Search, TrendingUp, AlertTriangle, Eye, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './home.css'

const AirQualityMonitor = () => {
  const [currentAQI, setCurrentAQI] = useState(null);
  const [pollutantData, setPollutantData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [aqiHistory, setAqiHistory] = useState([]);
  const [error, setError] = useState('');

  const API_KEY = 'c8b3d6c40349d4c0de79ea767641604e';
  
  // AQI Categories and colors
  const getAQICategory = (aqi) => {
    if (aqi <= 50) return { category: 'Good', className: 'aqi-good' };
    if (aqi <= 100) return { category: 'Moderate', className: 'aqi-moderate' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive', className: 'aqi-unhealthy-sensitive' };
    if (aqi <= 200) return { category: 'Unhealthy', className: 'aqi-unhealthy' };
    if (aqi <= 300) return { category: 'Very Unhealthy', className: 'aqi-very-unhealthy' };
    return { category: 'Hazardous', className: 'aqi-hazardous' };
  };

  // Calculate AQI from pollutant concentrations
  const calculateAQI = (pollutants) => {
    const { co, no, no2, o3, so2, pm2_5, pm10, nh3 } = pollutants;
    
    // AQI calculation based on US EPA standards
    const calculateSubIndex = (concentration, breakpoints) => {
      for (let i = 0; i < breakpoints.length; i++) {
        const bp = breakpoints[i];
        if (concentration <= bp.high) {
          return ((bp.aqiHigh - bp.aqiLow) / (bp.high - bp.low)) * (concentration - bp.low) + bp.aqiLow;
        }
      }
      return 500; // Hazardous level
    };

    // PM2.5 breakpoints (μg/m³)
    const pm25Breakpoints = [
      { low: 0, high: 12, aqiLow: 0, aqiHigh: 50 },
      { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
      { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
      { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
      { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
      { low: 250.5, high: 500, aqiLow: 301, aqiHigh: 500 }
    ];

    // PM10 breakpoints (μg/m³)
    const pm10Breakpoints = [
      { low: 0, high: 54, aqiLow: 0, aqiHigh: 50 },
      { low: 55, high: 154, aqiLow: 51, aqiHigh: 100 },
      { low: 155, high: 254, aqiLow: 101, aqiHigh: 150 },
      { low: 255, high: 354, aqiLow: 151, aqiHigh: 200 },
      { low: 355, high: 424, aqiLow: 201, aqiHigh: 300 },
      { low: 425, high: 604, aqiLow: 301, aqiHigh: 500 }
    ];

    const pm25AQI = pm2_5 ? calculateSubIndex(pm2_5, pm25Breakpoints) : 0;
    const pm10AQI = pm10 ? calculateSubIndex(pm10, pm10Breakpoints) : 0;
    
    // Return the highest AQI value (most restrictive)
    return Math.max(pm25AQI, pm10AQI, 1);
  };

  // Health suggestions based on AQI
  const getHealthSuggestions = (aqi) => {
    if (aqi <= 50) return [
      "Air quality is good. Perfect for outdoor activities!",
      "Great day for jogging, cycling, or outdoor sports.",
      "Windows can be opened for fresh air ventilation."
    ];
    if (aqi <= 100) return [
      "Air quality is acceptable for most people.",
      "Sensitive individuals should consider limiting prolonged outdoor activities.",
      "Good day for normal outdoor activities with minor precautions."
    ];
    if (aqi <= 150) return [
      "Sensitive groups should reduce outdoor activities.",
      "Children, elderly, and people with respiratory issues should stay indoors.",
      "Consider wearing a mask if you must go outside."
    ];
    if (aqi <= 200) return [
      "Everyone should limit outdoor activities.",
      "Wear N95 masks when going outside.",
      "Keep windows closed and use air purifiers indoors.",
      "Avoid outdoor exercise and strenuous activities."
    ];
    if (aqi <= 300) return [
      "Avoid all outdoor activities.",
      "Stay indoors with windows and doors closed.",
      "Use air purifiers and wear masks even indoors if needed.",
      "Seek medical attention if experiencing breathing difficulties."
    ];
    return [
      "Health emergency conditions! Stay indoors.",
      "Avoid all outdoor exposure.",
      "Use high-quality air purifiers and sealed indoor spaces.",
      "Seek immediate medical attention for any respiratory symptoms."
    ];
  };

  // Get user's current location
  const getCurrentLocation = () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude, name: 'Current Location' });
        fetchAQIData(latitude, longitude, 'Current Location');
      },
      (error) => {
        setError('Unable to get your location. Please search for a city manually.');
        setLoading(false);
      }
    );
  };

  // Fetch AQI data from OpenWeatherMap
  const fetchAQIData = async (lat, lon, locationName) => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch air pollution data
      const aqiResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      
      // Fetch weather data
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );

      if (!aqiResponse.ok || !weatherResponse.ok) {
        throw new Error('Failed to fetch data from API');
      }

      const aqiData = await aqiResponse.json();
      const weatherInfo = await weatherResponse.json();

      // Extract pollutant data
      const pollutants = aqiData.list[0].components;
      setPollutantData(pollutants);

      // Calculate AQI from pollutant concentrations
      const calculatedAQI = Math.round(calculateAQI(pollutants));
      setCurrentAQI(calculatedAQI);

      // Set weather data
      setWeatherData({
        temp: Math.round(weatherInfo.main.temp),
        humidity: weatherInfo.main.humidity,
        wind_speed: weatherInfo.wind.speed.toFixed(1),
        visibility: weatherInfo.visibility ? (weatherInfo.visibility / 1000).toFixed(1) : 'N/A',
        description: weatherInfo.weather[0].description
      });

      setLocation({ lat, lon, name: locationName });

      // Add to history
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newHistoryPoint = { time: timestamp, aqi: calculatedAQI };
      setAqiHistory(prev => [...prev.slice(-9), newHistoryPoint]); // Keep last 10 points

    } catch (err) {
      setError('Failed to fetch air quality data. Please check your internet connection and try again.');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search city by name
  const searchCityAQI = async () => {
    if (!searchCity.trim()) return;
    
    setLoading(true);
    setError('');

    try {
      // Geocoding API to get coordinates from city name
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${searchCity}&limit=1&appid=${API_KEY}`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Geocoding API error');
      }

      const geoData = await geoResponse.json();
      
      if (geoData.length === 0) {
        setError('City not found. Please check the spelling and try again.');
        setLoading(false);
        return;
      }

      const { lat, lon, name, country } = geoData[0];
      const fullLocationName = `${name}, ${country}`;
      
      await fetchAQIData(lat, lon, fullLocationName);
      setSearchCity(''); // Clear search input
      
    } catch (err) {
      setError('Failed to search for city. Please try again.');
      console.error('Search Error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const aqiCategory = currentAQI ? getAQICategory(currentAQI) : null;
  const healthSuggestions = currentAQI ? getHealthSuggestions(currentAQI) : [];

  return (
    <div className={`app-container ${aqiCategory?.className || 'default-bg'}`}>
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <h1 className="main-title">
            Air Quality Monitor
          </h1>
          <p className="subtitle">
            Real-time AQI monitoring and health awareness system
          </p>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-group">
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Enter city name (e.g., Mumbai, Delhi, London)"
                className="search-input"
                onKeyPress={(e) => e.key === 'Enter' && searchCityAQI()}
              />
            </div>
            <button
              onClick={searchCityAQI}
              disabled={loading || !searchCity.trim()}
              className="search-btn"
            >
              <Search size={20} />
              Search
            </button>
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="location-btn"
            >
              <MapPin size={20} />
              My Location
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <div className="error-content">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Fetching air quality data...</p>
          </div>
        )}

        {/* Main Content */}
        {currentAQI && !loading && (
          <div className="content-sections">
            {/* Current AQI Display */}
            <div className="aqi-display-section">
              <div className="aqi-display-content">
                <div className="location-header">
                  <MapPin size={24} className="location-icon" />
                  <h2 className="location-name">
                    {location?.name}
                  </h2>
                </div>
                
                <div className="aqi-main-display">
                  <div className={`aqi-circle ${aqiCategory.className}-circle`}>
                    <span className="aqi-number">{currentAQI}</span>
                  </div>
                  <div className="aqi-category-info">
                    <h3 className={`aqi-category-text ${aqiCategory.className}-text`}>
                      {aqiCategory.category}
                    </h3>
                    <p className="aqi-label">Air Quality Index</p>
                  </div>
                </div>

                {/* Weather Information */}
                {weatherData && (
                  <div className="weather-grid">
                    <div className="weather-item">
                      <Thermometer className="weather-icon temp-icon" size={24} />
                      <div className="weather-info">
                        <p className="weather-label">Temperature</p>
                        <p className="weather-value">{weatherData.temp}°C</p>
                      </div>
                    </div>
                    <div className="weather-item">
                      <Droplets className="weather-icon humidity-icon" size={24} />
                      <div className="weather-info">
                        <p className="weather-label">Humidity</p>
                        <p className="weather-value">{weatherData.humidity}%</p>
                      </div>
                    </div>
                    <div className="weather-item">
                      <Wind className="weather-icon wind-icon" size={24} />
                      <div className="weather-info">
                        <p className="weather-label">Wind Speed</p>
                        <p className="weather-value">{weatherData.wind_speed} m/s</p>
                      </div>
                    </div>
                    <div className="weather-item">
                      <Eye className="weather-icon visibility-icon" size={24} />
                      <div className="weather-info">
                        <p className="weather-label">Visibility</p>
                        <p className="weather-value">{weatherData.visibility} km</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pollutant Details */}
            {pollutantData && (
              <div className="pollutant-section">
                <h3 className="section-title">
                  <Zap className="section-icon" size={24} />
                  Pollutant Concentrations (μg/m³)
                </h3>
                <div className="pollutant-grid">
                  <div className="pollutant-item">
                    <p className="pollutant-label">PM2.5</p>
                    <p className="pollutant-value">{pollutantData.pm2_5?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="pollutant-item">
                    <p className="pollutant-label">PM10</p>
                    <p className="pollutant-value">{pollutantData.pm10?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="pollutant-item">
                    <p className="pollutant-label">NO₂</p>
                    <p className="pollutant-value">{pollutantData.no2?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="pollutant-item">
                    <p className="pollutant-label">O₃</p>
                    <p className="pollutant-value">{pollutantData.o3?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="pollutant-item">
                    <p className="pollutant-label">SO₂</p>
                    <p className="pollutant-value">{pollutantData.so2?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="pollutant-item">
                    <p className="pollutant-label">CO</p>
                    <p className="pollutant-value">{pollutantData.co?.toFixed(0) || 'N/A'}</p>
                  </div>
                  <div className="pollutant-item">
                    <p className="pollutant-label">NO</p>
                    <p className="pollutant-value">{pollutantData.no?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="pollutant-item">
                    <p className="pollutant-label">NH₃</p>
                    <p className="pollutant-value">{pollutantData.nh3?.toFixed(1) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Health Suggestions */}
            <div className="health-section">
              <h3 className="section-title">
                <AlertTriangle className="section-icon health-icon" size={24} />
                Health Recommendations
              </h3>
              <ul className="health-suggestions">
                {healthSuggestions.map((suggestion, index) => (
                  <li key={index} className="health-suggestion">
                    <div className={`suggestion-bullet ${aqiCategory.className}-bullet`}></div>
                    <span className="suggestion-text">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AQI Trend Graph */}
            {aqiHistory.length > 1 && (
              <div className="chart-section">
                <h3 className="section-title">
                  <TrendingUp className="section-icon chart-icon" size={24} />
                  AQI Trend (Last {aqiHistory.length} readings)
                </h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={aqiHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 'dataMax + 20']} />
                      <Tooltip 
                        labelFormatter={(label) => `Time: ${label}`}
                        formatter={(value) => [`${value}`, 'AQI']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="aqi" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 8, fill: '#1D4ED8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* AQI Scale Reference */}
            <div className="scale-section">
              <h3 className="section-title">AQI Scale Reference</h3>
              <div className="scale-grid">
                <div className="scale-item aqi-good-scale">
                  <div className="scale-indicator aqi-good-indicator"></div>
                  <div className="scale-info">
                    <p className="scale-category aqi-good-text">Good (0-50)</p>
                    <p className="scale-description">Minimal impact</p>
                  </div>
                </div>
                <div className="scale-item aqi-moderate-scale">
                  <div className="scale-indicator aqi-moderate-indicator"></div>
                  <div className="scale-info">
                    <p className="scale-category aqi-moderate-text">Moderate (51-100)</p>
                    <p className="scale-description">Acceptable quality</p>
                  </div>
                </div>
                <div className="scale-item aqi-unhealthy-sensitive-scale">
                  <div className="scale-indicator aqi-unhealthy-sensitive-indicator"></div>
                  <div className="scale-info">
                    <p className="scale-category aqi-unhealthy-sensitive-text">Unhealthy for Sensitive (101-150)</p>
                    <p className="scale-description">Sensitive groups affected</p>
                  </div>
                </div>
                <div className="scale-item aqi-unhealthy-scale">
                  <div className="scale-indicator aqi-unhealthy-indicator"></div>
                  <div className="scale-info">
                    <p className="scale-category aqi-unhealthy-text">Unhealthy (151-200)</p>
                    <p className="scale-description">Everyone affected</p>
                  </div>
                </div>
                <div className="scale-item aqi-very-unhealthy-scale">
                  <div className="scale-indicator aqi-very-unhealthy-indicator"></div>
                  <div className="scale-info">
                    <p className="scale-category aqi-very-unhealthy-text">Very Unhealthy (201-300)</p>
                    <p className="scale-description">Health warnings</p>
                  </div>
                </div>
                <div className="scale-item aqi-hazardous-scale">
                  <div className="scale-indicator aqi-hazardous-indicator"></div>
                  <div className="scale-info">
                    <p className="scale-category aqi-hazardous-text">Hazardous (300+)</p>
                    <p className="scale-description">Emergency conditions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Weather Description */}
            {weatherData?.description && (
              <div className="conditions-section">
                <h3 className="section-title">Current Conditions</h3>
                <p className="conditions-description">
                  {weatherData.description}
                </p>
                <p className="last-updated">
                  Last updated: {new Date().toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Initial State Message */}
        {!currentAQI && !loading && (
          <div className="welcome-container">
            <div className="welcome-content">
              <h3 className="welcome-title">Welcome to Air Quality Monitor</h3>
              <p className="welcome-description">
                Get real-time air quality information for your location or search for any city worldwide.
              </p>
              <div className="welcome-actions">
                <button
                  onClick={getCurrentLocation}
                  className="welcome-btn"
                >
                  <MapPin size={20} />
                  Use My Current Location
                </button>
                <p className="welcome-hint">
                  Or search for a specific city using the search box above
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AirQualityMonitor;