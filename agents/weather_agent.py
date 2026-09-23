from langchain_core.messages import SystemMessage, HumanMessage
from LLM import llm

def run_weather_agent(state: dict) -> dict:
    destination = state["destination"]
    travel_dates = state["travel_dates"]

    system = SystemMessage(content="""You are a practical travel meteorologist with years of on-the-ground experience. 
You know that weather can make or break a trip. You don't just recite climate data — 
you tell travelers what the weather actually feels like, how it affects daily activities, 
what to pack, and whether the timing is ideal or something to work around.""")

    human = HumanMessage(content=f"""What should I expect weather-wise when visiting {destination} around {travel_dates}?

Cover:
- Typical temperature range (day and night)
- Rainfall / humidity / wind
- Whether this is the best time to visit, or if there are trade-offs
- How the weather will affect the activities and itinerary
- A practical packing list tailored to the conditions
- Any weather-related warnings (monsoon season, hurricane risks, extreme heat, etc.)

Be honest — if the timing isn't ideal, say so and explain what to expect.""")

    response = llm.invoke([system, human])
    return {**state, "weather_info": response.content}
