from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm_for_agent

def run_destination_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]

    system = SystemMessage(content="""You are a careful, friendly travel researcher. Be concise, practical, and specific.
Return Markdown under these exact headings: `### Quick-look overview`, `### Getting there & legal basics`, and `### Highlights & local tips`.
Use compact bullets or a small Markdown table where useful. Cover transport, entry/visa checks, insurance, connectivity, currency, neighborhoods, culture, and safety when relevant. Do not invent current prices or legal requirements; mark details that need official verification.""")

    human = HumanMessage(content=f"""Tell me everything I need to know about visiting {destination}.
We are {travelers} traveler(s) going around {travel_dates}.
Cover the most useful details for this trip. Keep each section brief and do not repeat the same point.""")

    response = llm_for_agent("destination_agent").invoke([system, human])
    return {**state, "destination_info": response.content}
