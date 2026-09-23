from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm

def run_destination_agent(state: dict) -> dict:
    destination = state["destination"]
    travelers = state["travelers"]
    travel_dates = state["travel_dates"]

    system = SystemMessage(content="""You are a seasoned travel expert with deep knowledge of destinations worldwide. 
You speak like a well-traveled friend — warm, enthusiastic, and genuinely helpful. 
When someone asks about a destination, you share the best spots, hidden gems, local customs, 
practical tips, and cultural etiquette in a way that feels personal and exciting, not like a brochure.""")

    human = HumanMessage(content=f"""Tell me everything I need to know about visiting {destination}.
We are {travelers} traveler(s) going around {travel_dates}.
Cover: top attractions, hidden gems, local culture and customs, language tips, 
safety, best neighborhoods to explore, and any must-know practical information.""")

    response = llm.invoke([system, human])
    return {**state, "destination_info": response.content}
