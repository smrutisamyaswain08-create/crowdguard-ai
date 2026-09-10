import urllib.request
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Official ISRO Bhuvan WMS & Geospatial Services Base URLs
ISRO_BHUVAN_WMS_BASE = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms"
ISRO_BHUVAN_OPEN_DATA = "https://bhuvan-app1.nrsc.gov.in/api"

# Open-Meteo Public Weather API (Puri Coordinates: 19.8135 N, 85.8312 E)
PURI_LAT = 19.8135
PURI_LON = 85.8312
OPEN_METEO_URL = f"https://api.open-meteo.com/v1/forecast?latitude={PURI_LAT}&longitude={PURI_LON}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability"

def fetch_live_weather_telemetry():
    """
    Fetches real-time atmospheric telemetry for Puri / Konark, Odisha
    from Open-Meteo / IMD public observation endpoint.
    """
    try:
        req = urllib.request.Request(
            OPEN_METEO_URL,
            headers={'User-Agent': 'CrowdGuard-Puri-GIS/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            cw = data.get('current_weather', {})
            temp = cw.get('temperature', 29.5)
            wind = cw.get('windspeed', 12.0)
            weather_code = cw.get('weathercode', 0)
            
            # Map WMO Weather Codes to descriptive conditions
            condition_map = {
                0: "Clear Sky",
                1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
                45: "Foggy", 48: "Depositing Rime Fog",
                51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
                61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Downpour",
                80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
                95: "Thunderstorm", 96: "Thunderstorm with Hail"
            }
            condition = condition_map.get(weather_code, "Partly Cloudy")
            
            hourly = data.get('hourly', {})
            humidity = hourly.get('relativehumidity_2m', [68])[0] if hourly.get('relativehumidity_2m') else 68
            precip = hourly.get('precipitation_probability', [20])[0] if hourly.get('precipitation_probability') else 20

            return {
                "source": "IMD / Open-Meteo Real-Time Observation",
                "status": "LIVE",
                "temperature_c": temp,
                "weather_condition": condition,
                "humidity_pct": humidity,
                "precipitation_risk_pct": precip,
                "wind_speed_kmh": wind,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
    except Exception as e:
        logger.warning(f"Live weather telemetry API fetch fallback: {e}")
        return {
            "source": "IMD / Open-Meteo Observation (Offline Fallback)",
            "status": "API_OFFLINE",
            "temperature_c": 29.2,
            "weather_condition": "Partly Cloudy",
            "humidity_pct": 68,
            "precipitation_risk_pct": 20,
            "wind_speed_kmh": 14.0,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

def get_isro_bhuvan_layers(site_id="jagannath_puri"):
    """
    Returns official ISRO Bhuvan WMS (Web Map Service) capabilities,
    tile endpoint URLs, and geospatial metadata for Odisha pilgrimage sites.
    """
    sites_coords = {
        "jagannath_puri": {
            "name": "Shree Jagannath Temple & Bada Danda (Puri, Odisha)",
            "lat": 19.8135,
            "lng": 85.8312,
            "bhuvan_tile_id": "OR_PURI_2026_VEC",
            "bbox": [85.8150, 19.8050, 85.8450, 19.8250]
        },
        "konark_sun_temple": {
            "name": "Konark Sun Temple & Marine Drive (Konark, Odisha)",
            "lat": 19.8876,
            "lng": 86.0945,
            "bhuvan_tile_id": "OR_KONARK_2026_VEC",
            "bbox": [86.0800, 19.8750, 86.1100, 19.8950]
        },
        "puri_sea_beach": {
            "name": "Puri Golden Sea Beach & Swargadwar Promenade (Puri, Odisha)",
            "lat": 19.7960,
            "lng": 85.8200,
            "bhuvan_tile_id": "OR_BEACH_2026_VEC",
            "bbox": [85.8000, 19.7850, 85.8400, 19.8050]
        }
    }
    
    selected_site = sites_coords.get(site_id, sites_coords["jagannath_puri"])
    weather = fetch_live_weather_telemetry()

    return {
        "satellite_agency": "ISRO / NRSC (National Remote Sensing Centre, Hyderabad)",
        "portal_name": "ISRO Bhuvan Odisha Earth Observation Service",
        "wms_base_url": ISRO_BHUVAN_WMS_BASE,
        "site_info": selected_site,
        "wms_layers": [
            {
                "id": "bhuvan_satellite_basemap",
                "title": "ISRO Bhuvan High-Resolution Satellite Basemap",
                "wms_url": f"{ISRO_BHUVAN_WMS_BASE}?service=WMS&version=1.1.1&request=GetMap&layers=bhuvan_sat&styles=&bbox={selected_site['bbox'][0]},{selected_site['bbox'][1]},{selected_site['bbox'][2]},{selected_site['bbox'][3]}&width=512&height=512&srs=EPSG:4326&format=image/png",
                "status": "ACTIVE_WMS"
            },
            {
                "id": "bhuvan_lulc_250k",
                "title": "ISRO NRSC Land Use Land Cover (LULC)",
                "wms_url": f"{ISRO_BHUVAN_WMS_BASE}?service=WMS&version=1.1.1&request=GetMap&layers=lulc250k&styles=&bbox={selected_site['bbox'][0]},{selected_site['bbox'][1]},{selected_site['bbox'][2]},{selected_site['bbox'][3]}&width=512&height=512&srs=EPSG:4326&format=image/png",
                "status": "ACTIVE_WMS"
            },
            {
                "id": "bhuvan_flood_water_indicator",
                "title": "ISRO Disaster Management Water & Coastal Surge Indicator",
                "wms_url": f"{ISRO_BHUVAN_WMS_BASE}?service=WMS&version=1.1.1&request=GetMap&layers=flood_hazard_or&styles=&bbox={selected_site['bbox'][0]},{selected_site['bbox'][1]},{selected_site['bbox'][2]},{selected_site['bbox'][3]}&width=512&height=512&srs=EPSG:4326&format=image/png",
                "status": "ACTIVE_WMS"
            }
        ],
        "environmental_telemetry": weather,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
