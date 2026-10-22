from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm_for_agent

def run_itinerary_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    destination_info = state.get("destination_info", "")[:800]

    system = SystemMessage(content="You are a meticulous, practical trip planner. Return only a Markdown table with one row for every trip day. Use columns: Day | Base city | Morning | Afternoon | Evening. Keep each cell compact, account for travel time and winter/daylight where relevant, and do not omit dates or invent bookings. For trips over 14 days, keep each activity especially brief.")

    human = HumanMessage(content=f"Build a concise day-by-day itinerary for {travelers} traveler(s) "
f"visiting {destination} around {travel_dates}. "
f"Context: {destination_info} "
f"Include a realistic morning, afternoon, and evening plan for every day, with a meal suggestion or local tip where space allows. Keep every row concise.")

    response = llm_for_agent("itinerary_agent").invoke([system, human])
    return {**state, "itinerary": response.content}
