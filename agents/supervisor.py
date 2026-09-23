from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm

def run_supervisor(state: dict) -> dict:
    completed = state.get("completed_agents", [])
    sequence = ["destination_agent", "itinerary_agent", "budget_agent", "hotel_agent", "weather_agent", "compile"]
    for step in sequence:
        if step not in completed:
            return {**state, "next": step}
    return {**state, "next": "FINISH"}


def compile_final_plan(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    budget = state["budget"]

    dest = state.get("destination_info", "")[:500]
    itin = state.get("itinerary", "")[:500]
    budg = state.get("budget_estimate", "")[:400]
    hotel = state.get("hotel_recommendations", "")[:400]
    weather = state.get("weather_info", "")[:400]

    system = SystemMessage(content="You are a master travel consultant. "
"Synthesize research into one cohesive, warm, and practical travel guide. "
"Write like a trusted friend who has done all the planning for you.")

    human = HumanMessage(content=f"Write a polished travel guide for {travelers} traveler(s) "
f"going to {destination} around {travel_dates} with a {budget} budget.\n\n"
f"DESTINATION: {dest}\n"
f"ITINERARY: {itin}\n"
f"BUDGET: {budg}\n"
f"HOTELS: {hotel}\n"
f"WEATHER: {weather}\n\n"
f"Write a unified guide with clear sections. Keep it personal and practical.")

    response = llm.invoke([system, human])
    return {**state, "final_plan": response.content, "completed_agents": state.get("completed_agents", []) + ["compile"]}
