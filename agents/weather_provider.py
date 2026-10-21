"""Open-Meteo geocoding and date-appropriate weather data access."""

import json
from datetime import date
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class WeatherDataError(RuntimeError):
    pass


def _request_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "VoyauraTravelAdvisor/1.0"})
    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise WeatherDataError(f"Open-Meteo request failed: {exc}") from exc

    if payload.get("error"):
        raise WeatherDataError(payload.get("reason", "Open-Meteo returned an error."))
    return payload


def _trip_range(travel_dates: str) -> tuple[date, date] | None:
    """Read explicit YYYY-MM-DD dates from the form's date-range value."""
    dates = []
    for part in travel_dates.split():
        try:
            parsed = date.fromisoformat(part.strip(".,;()[]"))
            if parsed not in dates:
                dates.append(parsed)
        except ValueError:
            continue

    if not dates:
        return None
    return dates[0], dates[1] if len(dates) > 1 else dates[0]


def fetch_trip_weather(destination: str, travel_dates: str) -> dict:
    trip_range = _trip_range(travel_dates)
    if not trip_range:
        raise WeatherDataError("Choose a start and end date to request weather for your trip.")

    start_date, end_date = trip_range
    if end_date < start_date:
        raise WeatherDataError("The trip end date must be on or after the start date.")

    today = date.today()
    if end_date >= today and (end_date - max(start_date, today)).days > 15:
        raise WeatherDataError("Live forecasts are available only within the provider's 16-day forecast window. Choose dates within that window to get a live forecast.")

    locations = _request_json("https://geocoding-api.open-meteo.com/v1/search?" + urlencode({
        "name": destination,
        "count": 5,
        "language": "en",
        "format": "json",
    })).get("results", [])
    if not locations:
        raise WeatherDataError(f"Open-Meteo could not find coordinates for {destination!r}.")

    # Prefer an exact city-name match when geocoding returns one.
    place = next((item for item in locations if item.get("name", "").casefold() == destination.split(",")[0].strip().casefold()), locations[0])

    archive = end_date < today
    endpoint = "https://archive-api.open-meteo.com/v1/archive" if archive else "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "timezone": "auto",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max,sunrise,sunset",
    }
    weather = _request_json(endpoint + "?" + urlencode(params))
    return {
        "source": "Open-Meteo Archive" if archive else "Open-Meteo Forecast",
        "location": ", ".join(filter(None, [place.get("name"), place.get("admin1"), place.get("country")])),
        "requested_dates": f"{start_date.isoformat()} to {end_date.isoformat()}",
        "timezone": weather.get("timezone"),
        "daily_units": weather.get("daily_units", {}),
        "daily": weather.get("daily", {}),
    }
