import json
import logging
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from LLM import llm_with_tools

logger = logging.getLogger(__name__)


def _run_tool_loop(llm, tools, messages, max_rounds: int = 5):
    """Call the LLM, execute any tool calls it requests, feed results back,
    and repeat until it produces a final text response (or we hit max_rounds)."""
    tools_by_name = {t.name: t for t in tools}

    for _ in range(max_rounds):
        response = llm.invoke(messages)

        if not response.tool_calls:
            return response

        messages.append(response)

        for call in response.tool_calls:
            tool_fn = tools_by_name.get(call["name"])
            if tool_fn is None:
                result = json.dumps({"error": f"Unknown tool: {call['name']}"})
            else:
                try:
                    result = tool_fn.invoke(call["args"])
                except Exception as exc:
                    result = json.dumps({"error": f"Tool '{call['name']}' failed: {exc}"})
            messages.append(ToolMessage(content=result, tool_call_id=call["id"]))

    return llm.invoke(messages)


def run_itinerary_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    destination_info = state.get("destination_info", "")[:800]

    llm, tools = llm_with_tools("itinerary_agent")

    system = SystemMessage(content="""You are a meticulous, practical trip planner with access to real data tools.

WORKFLOW — follow these steps:
1. Call `calculate_trip_days` with the start and end dates to know exactly how many days to plan for.
2. Call `geocode_location` to get the destination's coordinates.
3. Call `get_daylight_hours` for the first and last day of the trip to understand daylight constraints.
4. Using the tool results, build a realistic day-by-day itinerary.

Return only a Markdown table with one row for every trip day.
Use columns: Day | Base city | Morning | Afternoon | Evening.
Keep each cell compact, account for travel time and daylight where relevant, and do not omit dates or invent bookings.
For trips over 14 days, keep each activity especially brief.""")

    human = HumanMessage(content=f"""Build a concise day-by-day itinerary for {travelers} traveler(s) visiting {destination} around {travel_dates}.
Context: {destination_info}
Use your tools to calculate the exact trip duration and check daylight hours, then include a realistic morning, afternoon, and evening plan for every day, with a meal suggestion or local tip where space allows. Keep every row concise.""")

    response = _run_tool_loop(llm, tools, [system, human])
    return {**state, "itinerary": response.content}
