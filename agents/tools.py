"""Reusable LangChain tools that agents can invoke via tool-calling."""

import json
import logging
from datetime import date
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared HTTP helper
# ---------------------------------------------------------------------------

def _get_json(url: str, timeout: int = 12) -> dict:
    request = Request(url, headers={"User-Agent": "VoyauraTravelAdvisor/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


# ═══════════════════════════════════════════════════════════════════════════
# Weather tools  (used by weather_agent)
# ═══════════════════════════════════════════════════════════════════════════

@tool
def geocode_location(city_name: str) -> str:
    """Look up latitude, longitude, timezone, and country for a city name.

    Args:
        city_name: The city or place to geocode (e.g. "Tokyo", "Paris, France").

    Returns:
        JSON with the top match including latitude, longitude, country, timezone,
        and admin region, or an error message.
    """
    data = _get_json(
        "https://geocoding-api.open-meteo.com/v1/search?"
        + urlencode({"name": city_name, "count": 3, "language": "en", "format": "json"})
    )
    results = data.get("results", [])
    if not results:
        return json.dumps({"error": f"No coordinates found for '{city_name}'."})
    top = results[0]
    return json.dumps({
        "name": top.get("name"),
        "country": top.get("country"),
        "admin1": top.get("admin1"),
        "latitude": top["latitude"],
        "longitude": top["longitude"],
        "timezone": top.get("timezone"),
    })


@tool
def get_weather_forecast(latitude: float, longitude: float, start_date: str, end_date: str) -> str:
    """Fetch a daily weather forecast (up to 16 days ahead) from Open-Meteo.

    Args:
        latitude: Latitude of the location.
        longitude: Longitude of the location.
        start_date: Start date in YYYY-MM-DD format.
        end_date: End date in YYYY-MM-DD format.

    Returns:
        JSON with daily temperature highs/lows, precipitation, snowfall,
        wind speed, weather codes, and sunrise/sunset times.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "timezone": "auto",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max,sunrise,sunset",
    }
    data = _get_json("https://api.open-meteo.com/v1/forecast?" + urlencode(params))
    if data.get("error"):
        return json.dumps({"error": data.get("reason", "Open-Meteo returned an error.")})
    return json.dumps({
        "source": "Open-Meteo Forecast",
        "timezone": data.get("timezone"),
        "daily_units": data.get("daily_units", {}),
        "daily": data.get("daily", {}),
    })


@tool
def get_historical_weather(latitude: float, longitude: float, start_date: str, end_date: str) -> str:
    """Fetch historical daily weather data from the Open-Meteo Archive API.

    Args:
        latitude: Latitude of the location.
        longitude: Longitude of the location.
        start_date: Start date in YYYY-MM-DD format (must be in the past).
        end_date: End date in YYYY-MM-DD format (must be in the past).

    Returns:
        JSON with daily temperature highs/lows, precipitation, snowfall,
        wind speed, weather codes, and sunrise/sunset times.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "timezone": "auto",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max,sunrise,sunset",
    }
    data = _get_json("https://archive-api.open-meteo.com/v1/archive?" + urlencode(params))
    if data.get("error"):
        return json.dumps({"error": data.get("reason", "Open-Meteo returned an error.")})
    return json.dumps({
        "source": "Open-Meteo Archive",
        "timezone": data.get("timezone"),
        "daily_units": data.get("daily_units", {}),
        "daily": data.get("daily", {}),
    })


# ═══════════════════════════════════════════════════════════════════════════
# Currency / budget tools  (used by budget_agent)
# ═══════════════════════════════════════════════════════════════════════════

@tool
def convert_currency(amount: float, from_currency: str, to_currency: str) -> str:
    """Convert an amount from one currency to another using live exchange rates.

    Args:
        amount: The amount to convert.
        from_currency: Source currency code (e.g. "USD", "EUR", "JPY").
        to_currency: Target currency code (e.g. "INR", "USD", "GBP").

    Returns:
        JSON with the converted amount, exchange rate, and currency codes.
    """
    try:
        data = _get_json(f"https://open.er-api.com/v6/latest/{from_currency.upper()}")
        rates = data.get("rates", {})
        rate = rates.get(to_currency.upper())
        if rate is None:
            return json.dumps({"error": f"Currency '{to_currency}' not found."})
        return json.dumps({
            "from": from_currency.upper(),
            "to": to_currency.upper(),
            "rate": rate,
            "original_amount": amount,
            "converted_amount": round(amount * rate, 2),
        })
    except Exception as e:
        return json.dumps({"error": f"Currency conversion failed: {e}"})


@tool
def get_local_currency(country_name: str) -> str:
    """Look up the local currency for a country using the REST Countries API.

    Args:
        country_name: The country name (e.g. "Japan", "Germany", "India").

    Returns:
        JSON with the country's currency code, name, and symbol.
    """
    try:
        data = _get_json(
            f"https://restcountries.com/v3.1/name/{country_name}?fields=currencies,name"
        )
        if isinstance(data, list) and data:
            currencies = data[0].get("currencies", {})
            result = []
            for code, info in currencies.items():
                result.append({"code": code, "name": info.get("name"), "symbol": info.get("symbol")})
            return json.dumps({"country": data[0].get("name", {}).get("common", country_name), "currencies": result})
        return json.dumps({"error": f"No currency info found for '{country_name}'."})
    except Exception as e:
        return json.dumps({"error": f"Currency lookup failed: {e}"})


# ═══════════════════════════════════════════════════════════════════════════
# Destination / place research tools  (used by destination_agent)
# ═══════════════════════════════════════════════════════════════════════════

@tool
def search_country_info(country_name: str) -> str:
    """Get basic country facts: capital, population, region, languages, currencies, timezones, and borders.

    Args:
        country_name: The country name (e.g. "Japan", "France").

    Returns:
        JSON with capital, population, region, languages, currencies, timezones,
        borders, and driving side.
    """
    try:
        data = _get_json(
            f"https://restcountries.com/v3.1/name/{country_name}"
            "?fields=name,capital,population,region,subregion,languages,currencies,timezones,borders,car"
        )
        if isinstance(data, list) and data:
            c = data[0]
            return json.dumps({
                "name": c.get("name", {}).get("common"),
                "capital": c.get("capital", []),
                "population": c.get("population"),
                "region": c.get("region"),
                "subregion": c.get("subregion"),
                "languages": c.get("languages", {}),
                "currencies": {k: v.get("name") for k, v in c.get("currencies", {}).items()},
                "timezones": c.get("timezones", []),
                "borders": c.get("borders", []),
                "driving_side": c.get("car", {}).get("side"),
            })
        return json.dumps({"error": f"No info found for '{country_name}'."})
    except Exception as e:
        return json.dumps({"error": f"Country lookup failed: {e}"})


@tool
def search_nearby_places(latitude: float, longitude: float, category: str = "tourism") -> str:
    """Search for points of interest near a location using the Nominatim API.

    Args:
        latitude: Latitude of the center point.
        longitude: Longitude of the center point.
        category: Category to search, e.g. "tourism", "amenity", "historic".

    Returns:
        JSON list of nearby places with names, types, and distances.
    """
    try:
        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "json",
            "addressdetails": 1,
            "limit": 10,
            "zoom": 14,
        }
        url = "https://nominatim.openstreetmap.org/reverse?" + urlencode(params)
        request = Request(url, headers={"User-Agent": "VoyauraTravelAdvisor/1.0"})
        with urlopen(request, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
        return json.dumps({
            "location": data.get("display_name"),
            "address": data.get("address", {}),
            "type": data.get("type"),
        })
    except Exception as e:
        return json.dumps({"error": f"Place search failed: {e}"})


# ═══════════════════════════════════════════════════════════════════════════
# Hotel tools  (used by hotel_agent)
# ═══════════════════════════════════════════════════════════════════════════

@tool
def search_hotels_in_area(city: str, country: str, budget_level: str) -> str:
    """Search for accommodation options in a city using Open-Meteo geocoding and Nominatim.
    Returns area info to help recommend suitable neighborhoods.

    Args:
        city: City name (e.g. "Tokyo", "Berlin").
        country: Country name (e.g. "Japan", "Germany").
        budget_level: One of "budget", "mid-range", or "luxury".

    Returns:
        JSON with the city's coordinates, timezone, and surrounding area details
        to inform accommodation recommendations.
    """
    try:
        geo = _get_json(
            "https://geocoding-api.open-meteo.com/v1/search?"
            + urlencode({"name": f"{city}, {country}", "count": 1, "language": "en", "format": "json"})
        )
        results = geo.get("results", [])
        if not results:
            return json.dumps({"error": f"Could not locate {city}, {country}."})
        place = results[0]

        # Get area info from Nominatim
        nom_params = {
            "lat": place["latitude"],
            "lon": place["longitude"],
            "format": "json",
            "addressdetails": 1,
            "zoom": 12,
        }
        nom = _get_json(
            "https://nominatim.openstreetmap.org/reverse?"
            + urlencode(nom_params)
        )
        return json.dumps({
            "city": place.get("name"),
            "country": place.get("country"),
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "timezone": place.get("timezone"),
            "area_info": nom.get("display_name"),
            "budget_level": budget_level,
        })
    except Exception as e:
        return json.dumps({"error": f"Hotel area search failed: {e}"})


# ═══════════════════════════════════════════════════════════════════════════
# Itinerary tools  (used by itinerary_agent)
# ═══════════════════════════════════════════════════════════════════════════

@tool
def calculate_trip_days(start_date: str, end_date: str) -> str:
    """Calculate the number of days in a trip given start and end dates.

    Args:
        start_date: Trip start date in YYYY-MM-DD format.
        end_date: Trip end date in YYYY-MM-DD format.

    Returns:
        JSON with the number of full days and nights.
    """
    try:
        s = date.fromisoformat(start_date)
        e = date.fromisoformat(end_date)
        delta = (e - s).days
        if delta < 0:
            return json.dumps({"error": "End date is before start date."})
        return json.dumps({
            "start_date": start_date,
            "end_date": end_date,
            "total_days": delta + 1,
            "total_nights": delta,
        })
    except ValueError as exc:
        return json.dumps({"error": f"Invalid date format: {exc}"})


@tool
def get_daylight_hours(latitude: float, longitude: float, target_date: str) -> str:
    """Get sunrise and sunset times for a location on a specific date.

    Args:
        latitude: Latitude of the location.
        longitude: Longitude of the location.
        target_date: Date in YYYY-MM-DD format.

    Returns:
        JSON with sunrise, sunset times and total daylight hours.
    """
    try:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": target_date,
            "end_date": target_date,
            "timezone": "auto",
            "daily": "sunrise,sunset,daylight_duration",
        }
        data = _get_json("https://api.open-meteo.com/v1/forecast?" + urlencode(params))
        daily = data.get("daily", {})
        return json.dumps({
            "date": target_date,
            "sunrise": (daily.get("sunrise") or [None])[0],
            "sunset": (daily.get("sunset") or [None])[0],
            "daylight_seconds": (daily.get("daylight_duration") or [None])[0],
        })
    except Exception as e:
        return json.dumps({"error": f"Daylight lookup failed: {e}"})


# ═══════════════════════════════════════════════════════════════════════════
# Registry: which tools each agent gets
# ═══════════════════════════════════════════════════════════════════════════

AGENT_TOOLS = {
    "weather_agent": [geocode_location, get_weather_forecast, get_historical_weather],
    "budget_agent": [convert_currency, get_local_currency, geocode_location],
    "destination_agent": [search_country_info, geocode_location, search_nearby_places],
    "hotel_agent": [search_hotels_in_area, geocode_location, get_local_currency],
    "itinerary_agent": [calculate_trip_days, get_daylight_hours, geocode_location],
}
