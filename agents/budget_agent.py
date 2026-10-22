from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm_for_agent

def run_budget_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    budget_range = state["budget"]
    itinerary = state.get("itinerary", "")[:600]

    system = SystemMessage(content="You are a practical travel budget analyst. Return a concise Markdown table with columns Category | Estimated cost | Notes. State currency and whether amounts are per person, per day, or trip total. Use ranges and label uncertain estimates; never imply live prices.")

    human = HumanMessage(content=f"Give a concise budget breakdown for {travelers} traveler(s) "
f"visiting {destination} around {travel_dates} with a {budget_range} budget. "
f"Itinerary snippet: {itinerary} "
f"Cover flights, lodging, food, activities, local transport, other costs, and an estimated total. Keep the answer compact.")

    response = llm_for_agent("budget_agent").invoke([system, human])
    return {**state, "budget_estimate": response.content}
