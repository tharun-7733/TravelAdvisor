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


def run_hotel_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    budget_range = state["budget"]
    destination_info = state.get("destination_info", "")[:600]

    llm, tools = llm_with_tools("hotel_agent")

    system = SystemMessage(content="""You are a careful accommodation researcher with access to real data tools.

WORKFLOW — follow these steps:
1. Call `geocode_location` to confirm the destination city's coordinates and country.
2. Call `search_hotels_in_area` to get area information for the city and budget level.
3. Call `get_local_currency` to find the local currency for price references.
4. Using the tool results, recommend accommodation options.

Return a concise Markdown table with columns: Property | Area | Style | Approx. nightly rate | Why it fits.
Clearly label estimates and do not claim availability or live prices.
Base your area and neighborhood recommendations on the real location data from your tools.""")

    human = HumanMessage(content=f"""Recommend 3 places to stay in {destination} for {travelers} traveler(s) around {travel_dates} with a {budget_range} budget.
Context: {destination_info}
Use your tools to look up the location and local currency first, then recommend up to three options suited to the budget, mixing value and one distinctive stay when appropriate. Keep each row concise.""")

    response = _run_tool_loop(llm, tools, [system, human])
    return {**state, "hotel_recommendations": response.content}
