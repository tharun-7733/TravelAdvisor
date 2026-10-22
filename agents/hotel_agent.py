from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm_for_agent

def run_hotel_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    budget_range = state["budget"]
    destination_info = state.get("destination_info", "")[:600]

    system = SystemMessage(content="You are a careful accommodation researcher. Return a concise Markdown table with columns Property | Area | Style | Approx. nightly rate | Why it fits. Clearly label estimates and do not claim availability or live prices.")

    human = HumanMessage(content=f"Recommend 3 places to stay in {destination} for {travelers} traveler(s) "
f"around {travel_dates} with a {budget_range} budget. "
f"Context: {destination_info} "
f"Recommend up to three options suited to the budget, mixing value and one distinctive stay when appropriate. Keep each row concise.")

    response = llm_for_agent("hotel_agent").invoke([system, human])
    return {**state, "hotel_recommendations": response.content}
