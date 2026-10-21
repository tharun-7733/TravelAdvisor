from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm
from agents.weather_provider import WeatherDataError, fetch_trip_weather

def run_weather_agent(state: dict) -> dict:
    destination = state["destination"]
    travel_dates = state["travel_dates"]

    try:
        weather = fetch_trip_weather(destination, travel_dates)
    except WeatherDataError as exc:
        return {**state, "weather_info": f"Live weather data is unavailable for this trip: {exc}"}

    system = SystemMessage(content="""You are a practical travel meteorologist with years of on-the-ground experience.
Explain the weather data supplied below in clear travel terms. Use only the supplied measurements;
do not invent temperatures, rain, wind, weather conditions, or forecasts. Identify the source and dates.
If this is archive data, describe it as historical weather for those dates, not a future forecast.
If a field is missing, say that it was not available.""")

    human = HumanMessage(content=f"""Summarize weather for {weather['location']} for {weather['requested_dates']}.
Data source: {weather['source']}. Timezone: {weather.get('timezone') or 'not provided'}.
Units: {weather['daily_units']}
Daily data: {weather['daily']}

Describe the observed/forecast temperature and conditions by day, mention sunrise/sunset when available,
and give practical packing or itinerary advice grounded in these values. Make clear whether the data is
historical or forecast. Do not claim humidity or other values absent from the data.""")

    response = llm.invoke([system, human])
    return {**state, "weather_info": response.content}
