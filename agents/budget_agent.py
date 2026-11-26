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


def run_budget_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]
    budget_range = state["budget"]
    itinerary = state.get("itinerary", "")[:600]

    llm, tools = llm_with_tools("budget_agent")

    system = SystemMessage(content="""You are a practical travel budget analyst with access to real currency tools.

WORKFLOW — follow these steps:
1. Call `get_local_currency` with the destination country to find out the local currency code and symbol.
2. Call `convert_currency` to get the exchange rate between the traveler's likely home currency (USD) and the local currency.
3. Optionally call `geocode_location` to confirm the destination.
4. Using real exchange rate data, build a budget breakdown.

Return a concise Markdown table with columns: Category | Estimated cost | Notes.
State the currency and whether amounts are per person, per day, or trip total.
Use ranges and label uncertain estimates; never imply live prices.
Show the exchange rate you retrieved from the tool.""")

    human = HumanMessage(content=f"""Give a concise budget breakdown for {travelers} traveler(s) visiting {destination} around {travel_dates} with a {budget_range} budget.
Itinerary snippet: {itinerary}
First look up the local currency and current exchange rates, then cover: flights, lodging, food, activities, local transport, other costs, and an estimated total. Keep the answer compact.""")

    response = _run_tool_loop(llm, tools, [system, human])
    return {**state, "budget_estimate": response.content}
