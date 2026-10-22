def run_supervisor(state: dict) -> dict:
    completed = state.get("completed_agents", [])
    sequence = ["destination_agent", "itinerary_agent", "budget_agent", "hotel_agent", "weather_agent", "compile"]
    for step in sequence:
        if step not in completed:
            return {**state, "next": step}
    return {**state, "next": "FINISH"}


def compile_final_plan(state: dict) -> dict:
    destination = state["destination"]
    dates = state["travel_dates"]
    travelers = state["travelers"]
    budget = state["budget"]

    sections = [
        f"# {destination} — Personalized Travel Guide\n\n**Dates:** {dates}  \n**Travelers:** {travelers}  \n**Travel style:** {budget}",
        "## Destination overview & practical details\n\n" + (state.get("destination_info", "").strip() or "Destination details were not available."),
        "## Day-by-day itinerary\n\n" + (state.get("itinerary", "").strip() or "An itinerary was not available."),
        "## Budget breakdown\n\n" + (state.get("budget_estimate", "").strip() or "A budget estimate was not available."),
        "## Where to stay\n\n" + (state.get("hotel_recommendations", "").strip() or "Accommodation recommendations were not available."),
        "## Weather & packing\n\n" + (state.get("weather_info", "").strip() or "Weather guidance was not available."),
    ]
    guide = "\n\n".join(sections)
    return {**state, "final_plan": guide, "completed_agents": state.get("completed_agents", []) + ["compile"]}
