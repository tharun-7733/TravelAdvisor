from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm

def run_budget_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    budget_range = state["budget"]
    itinerary = state.get("itinerary", "")[:600]

    system = SystemMessage(content="You are a practical travel finance expert. "
"Budgeting is about knowing where money creates the most value — "
"when to splurge and when to save.")

    human = HumanMessage(content=f"Give a concise budget breakdown for {travelers} traveler(s) "
f"visiting {destination} around {travel_dates} with a {budget_range} budget. "
f"Itinerary snippet: {itinerary} "
f"Cover: flights, accommodation/night, food/day, activities, transport, misc, and total. "
f"Give a single realistic range per category.")

    response = llm.invoke([system, human])
    return {**state, "budget_estimate": response.content}
