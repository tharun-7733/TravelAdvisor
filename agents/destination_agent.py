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


def run_destination_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]

    llm, tools = llm_with_tools("destination_agent")

    system = SystemMessage(content="""You are a careful, friendly travel researcher with access to real data tools.

WORKFLOW — follow these steps:
1. Call `search_country_info` to get facts about the destination country (capital, languages, currencies, timezones, driving side, etc.).
2. Call `geocode_location` to get the city's coordinates and timezone.
3. Optionally call `search_nearby_places` to learn about the area.
4. Synthesize all tool results into a concise, practical travel brief.

Return Markdown under these exact headings:
- `### Quick-look overview` — key facts (currency, language, timezone, visa notes)
- `### Getting there & legal basics` — transport, entry requirements, insurance
- `### Highlights & local tips` — top things to do, neighborhoods, culture, safety

Use compact bullets or a small Markdown table where useful. Only state facts backed by tool results. Mark details that need official verification.""")

    human = HumanMessage(content=f"""Tell me everything I need to know about visiting {destination}.
We are {travelers} traveler(s) going around {travel_dates}.
Use your tools to look up real country data and location info first, then write the brief.""")

    response = _run_tool_loop(llm, tools, [system, human])
    return {**state, "destination_info": response.content}
