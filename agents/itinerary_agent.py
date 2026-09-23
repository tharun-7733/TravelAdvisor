from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm

def run_itinerary_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    destination_info = state.get("destination_info", "")[:800]

    system = SystemMessage(content="You are a meticulous trip planner with a real sense of adventure. "
"You build experiences, not just lists. You think about pacing, energy levels, "
"iconic landmarks mixed with quiet local moments, and room for spontaneity.")

    human = HumanMessage(content=f"Build a concise day-by-day itinerary for {travelers} traveler(s) "
f"visiting {destination} around {travel_dates}. "
f"Context: {destination_info} "
f"Include morning, afternoon, evening activities, a meal suggestion, and one local tip per day. Keep it brief.")

    response = llm.invoke([system, human])
    return {**state, "itinerary": response.content}
