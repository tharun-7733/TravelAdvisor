from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm

def run_hotel_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    budget_range = state["budget"]
    destination_info = state.get("destination_info", "")[:600]

    system = SystemMessage(content="You are a seasoned traveler who knows that where you sleep "
"shapes the entire texture of a trip. You recommend places based on vibe, "
"location, value, and the kind of traveler asking.")

    human = HumanMessage(content=f"Recommend 3 places to stay in {destination} for {travelers} traveler(s) "
f"around {travel_dates} with a {budget_range} budget. "
f"Context: {destination_info} "
f"For each: name, neighborhood, why it stands out, and rough nightly cost. Keep it concise.")

    response = llm.invoke([system, human])
    return {**state, "hotel_recommendations": response.content}
