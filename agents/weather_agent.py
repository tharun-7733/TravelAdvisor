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
            return response  # final text answer

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

    return llm.invoke(messages)  # final fallback call without expecting tools


def run_weather_agent(state: dict) -> dict:
    destination = state["destination"]
    travel_dates = state["travel_dates"]

    llm, tools = llm_with_tools("weather_agent")

    system = SystemMessage(content="""You are a careful travel weather analyst with access to real weather tools.

WORKFLOW — follow these steps exactly:
1. Call `geocode_location` with the destination city to get its coordinates.
2. Determine whether the travel dates are in the past or in the future.
   - For future dates (within 16 days): call `get_weather_forecast`.
   - For past dates: call `get_historical_weather`.
3. Once you have the weather data, summarize it in clear travel terms.

Use ONLY the data returned by your tools. Do not invent temperatures, rain, wind, or forecasts.
If a field is missing, say it was not available.
Use the headings `### Conditions` and `### Packing notes`, with concise bullets.""")

    human = HumanMessage(content=f"""Get weather information for {destination} during {travel_dates}.
Geocode the location first, then fetch the appropriate weather data (forecast or historical).
Summarize the results with practical travel packing advice.""")

    response = _run_tool_loop(llm, tools, [system, human])
    return {**state, "weather_info": response.content}
