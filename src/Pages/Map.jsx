import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Info, Loader, X } from 'lucide-react';
import './map.css';

const Map = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [aqiMarkers, setAqiMarkers] = useState([]);

  const API_KEY = 'c8b3d6c40349d4c0de79ea767641604e';

  // Load Leaflet CSS and JS
  useEffect(() => {
    // Check if Leaflet is already loaded
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js';
    script.onload = () => {
      setMapLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      if (!window.L) {
        document.head.removeChild(link);
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !window.L || mapInstanceRef.current) return;

    // Initialize map centered on India (you can change this)
    const map = window.L.map(mapRef.current).setView([20.5937, 78.9629], 5);

    // Add tile layer
    // Or use this CartoDB tile layer for consistent English labels:
window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO',
  maxZoom: 19
}).addTo(map);

    mapInstanceRef.current = map;

    // Add click event listener
    map.on('click', handleMapClick);

    // Load initial AQI points for major cities
    loadMajorCitiesAQI();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapLoaded]);

  // Get AQI color based on value
  const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#eab308';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    if (aqi <= 300) return '#a855f7';
    return '#6b21a8';
  };

  // Get AQI category
  const getAQICategory = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Calculate AQI from pollutant data
  const calculateAQI = (pollutants) => {
    const { pm2_5, pm10 } = pollutants;
    
    const calculateSubIndex = (concentration, breakpoints) => {
      for (let i = 0; i < breakpoints.length; i++) {
        const bp = breakpoints[i];
        if (concentration <= bp.high) {
          return ((bp.aqiHigh - bp.aqiLow) / (bp.high - bp.low)) * (concentration - bp.low) + bp.aqiLow;
        }
      }
      return 500;
    };

    const pm25Breakpoints = [
      { low: 0, high: 12, aqiLow: 0, aqiHigh: 50 },
      { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
      { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
      { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
      { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
      { low: 250.5, high: 500, aqiLow: 301, aqiHigh: 500 }
    ];

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
    
    return Math.max(pm25AQI, pm10AQI, 1);
  };

  // Handle map click
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    await fetchAQIForLocation(lat, lng, `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
  };

  // Fetch AQI for specific coordinates
  const fetchAQIForLocation = async (lat, lon, locationName) => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch AQI data');
      }

      const data = await response.json();
      const pollutants = data.list[0].components;
      const calculatedAQI = Math.round(calculateAQI(pollutants));

      const locationData = {
        name: locationName,
        lat,
        lon,
        aqi: calculatedAQI,
        category: getAQICategory(calculatedAQI),
        pollutants
      };

      setSelectedLocation(locationData);

      // Add marker to map
      if (mapInstanceRef.current && window.L) {
        const color = getAQIColor(calculatedAQI);
        
        const marker = window.L.circleMarker([lat, lon], {
          color: 'white',
          fillColor: color,
          fillOpacity: 0.8,
          radius: 12,
          weight: 3
        }).addTo(mapInstanceRef.current);

        // Add popup
        marker.bindPopup(`
          <div class="map-popup">
            <h4>${locationName}</h4>
            <div class="popup-aqi" style="color: ${color};">${calculatedAQI}</div>
            <div class="popup-category">${getAQICategory(calculatedAQI)}</div>
            <div class="popup-coords">
              ${lat.toFixed(4)}, ${lon.toFixed(4)}
            </div>
          </div>
        `).openPopup();

        // Store marker reference
        setAqiMarkers(prev => [...prev, marker]);
      }

    } catch (error) {
      console.error('Error fetching AQI:', error);
      setSelectedLocation({
        name: locationName,
        lat,
        lon,
        error: 'Failed to fetch AQI data'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load AQI for major cities
  const loadMajorCitiesAQI = async () => {
    const majorCities = [
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
      { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
      { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
      { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
      { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
      { name: 'Pune', lat: 18.5204, lon: 73.8567 },
      { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
      { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 }
    ];

    for (const city of majorCities) {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const pollutants = data.list[0].components;
          const calculatedAQI = Math.round(calculateAQI(pollutants));
          const color = getAQIColor(calculatedAQI);

          if (mapInstanceRef.current && window.L) {
            const marker = window.L.circleMarker([city.lat, city.lon], {
              color: 'white',
              fillColor: color,
              fillOpacity: 0.8,
              radius: 10,
              weight: 2
            }).addTo(mapInstanceRef.current);

            marker.bindPopup(`
              <div class="map-popup">
                <h4>${city.name}</h4>
                <div class="popup-aqi" style="color: ${color};">${calculatedAQI}</div>
                <div class="popup-category">${getAQICategory(calculatedAQI)}</div>
              </div>
            `);
          }
        }
      } catch (error) {
        console.error(`Error loading AQI for ${city.name}:`, error);
      }
    }
  };

  // Clear all markers except major cities
  const clearCustomMarkers = () => {
    if (mapInstanceRef.current) {
      // Clear all layers and reload major cities
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof window.L.CircleMarker) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });
      loadMajorCitiesAQI();
    }
    setAqiMarkers([]);
    setSelectedLocation(null);
  };

  return (
    <div className="map-page">
      <div className="map-header">
        <h1 className="map-title">
          <MapPin size={28} />
          Interactive AQI Map
        </h1>
        <p className="map-description">
          Click anywhere on the map to get real-time air quality data for that location
        </p>
        <div className="map-controls">
          <button onClick={clearCustomMarkers} className="clear-btn">
            <X size={16} />
            Clear Markers
          </button>
        </div>
      </div>

      <div className="map-container-wrapper">
        <div className="map-section">
          {!mapLoaded && (
            <div className="map-loading-initial">
              <Loader className="loading-icon" size={24} />
              <span>Loading interactive map...</span>
            </div>
          )}
          
          <div 
            ref={mapRef} 
            className="map-container"
            style={{ 
              height: '600px', 
              width: '100%',
              display: mapLoaded ? 'block' : 'none'
            }}
          />
          
          {loading && (
            <div className="map-loading-overlay">
              <div className="loading-content">
                <Loader className="loading-icon" size={20} />
                <span>Fetching AQI data...</span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Location Details */}
        {selectedLocation && (
          <div className="location-details-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Info size={20} />
                <h3>Location Details</h3>
              </div>
              <button 
                onClick={() => setSelectedLocation(null)}
                className="close-panel-btn"
              >
                <X size={16} />
              </button>
            </div>
            
            {selectedLocation.error ? (
              <div className="panel-error">
                <p>{selectedLocation.error}</p>
              </div>
            ) : (
              <div className="panel-content">
                <div className="location-main-info">
                  <h4 className="location-name">{selectedLocation.name}</h4>
                  <div className="aqi-display">
                    <span 
                      className="aqi-value"
                      style={{ color: getAQIColor(selectedLocation.aqi) }}
                    >
                      {selectedLocation.aqi}
                    </span>
                    <div className="aqi-info">
                      <span className="aqi-category">{selectedLocation.category}</span>
                      <span className="aqi-label">AQI</span>
                    </div>
                  </div>
                </div>
                
                <div className="coordinates-info">
                  <span>📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}</span>
                </div>

                {selectedLocation.pollutants && (
                  <div className="pollutants-summary">
                    <h5>Key Pollutants (μg/m³):</h5>
                    <div className="pollutants-grid">
                      <div className="pollutant-item">
                        <span className="pollutant-name">PM2.5</span>
                        <span className="pollutant-value">{selectedLocation.pollutants.pm2_5?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="pollutant-item">
                        <span className="pollutant-name">PM10</span>
                        <span className="pollutant-value">{selectedLocation.pollutants.pm10?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="pollutant-item">
                        <span className="pollutant-name">NO₂</span>
                        <span className="pollutant-value">{selectedLocation.pollutants.no2?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="pollutant-item">
                        <span className="pollutant-name">O₃</span>
                        <span className="pollutant-value">{selectedLocation.pollutants.o3?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="map-legend">
        <h4 className="legend-title">AQI Color Scale</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color good"></div>
            <span>Good (0-50)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color moderate"></div>
            <span>Moderate (51-100)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color unhealthy-sensitive"></div>
            <span>Unhealthy for Sensitive (101-150)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color unhealthy"></div>
            <span>Unhealthy (151-200)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color very-unhealthy"></div>
            <span>Very Unhealthy (201-300)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color hazardous"></div>
            <span>Hazardous (300+)</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="map-instructions">
        <h4>How to Use:</h4>
        <ul>
          <li>🖱️ <strong>Click anywhere</strong> on the map to get AQI data for that location</li>
          <li>🎯 <strong>Colored circles</strong> represent major cities with their current AQI</li>
          <li>📊 <strong>Click on markers</strong> to see detailed pollution information</li>
          <li>🗑️ <strong>Clear markers</strong> to remove custom location pins</li>
        </ul>
      </div>
    </div>
  );
};

export default Map;