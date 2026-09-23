import asyncio
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from graph import build_graph

app = FastAPI(title="Wanderful Travel Advisor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_LABELS = {
    "destination_agent": "Destination Expert",
    "itinerary_agent": "Itinerary Planner",
    "budget_agent": "Budget Analyst",
    "hotel_agent": "Hotel Scout",
    "weather_agent": "Weather Advisor",
    "compile": "Compiling Guide",
}


class TripRequest(BaseModel):
    destination: str
    travel_dates: str
    travelers: int = 1
    budget: str = "mid-range"


async def stream_trip(req: TripRequest):
    initial_state = {
        "destination": req.destination,
        "travelers": req.travelers,
        "travel_dates": req.travel_dates,
        "budget": req.budget,
        "destination_info": "",
        "itinerary": "",
        "budget_estimate": "",
        "hotel_recommendations": "",
        "weather_info": "",
        "final_plan": "",
        "next": "",
        "completed_agents": [],
    }

    graph = build_graph()
    completed_set = set()
    final_state = {}

    def send(event_type: str, data: dict) -> str:
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

    yield send("start", {"message": "Your travel team is on it!"})

    loop = asyncio.get_event_loop()

    def run_graph():
        results = []
        for event in graph.stream(initial_state, stream_mode="values"):
            results.append(event)
        return results

    events = await loop.run_in_executor(None, run_graph)

    for event in events:
        newly_completed = set(event.get("completed_agents", [])) - completed_set
        for agent in newly_completed:
            label = AGENT_LABELS.get(agent, agent)
            yield send("agent_done", {"agent": agent, "label": label})
            completed_set.add(agent)
            await asyncio.sleep(0)

        if event.get("final_plan"):
            final_state = event

    if final_state.get("final_plan"):
        yield send("complete", {
            "final_plan": final_state["final_plan"],
            "destination_info": final_state.get("destination_info", ""),
            "itinerary": final_state.get("itinerary", ""),
            "budget_estimate": final_state.get("budget_estimate", ""),
            "hotel_recommendations": final_state.get("hotel_recommendations", ""),
            "weather_info": final_state.get("weather_info", ""),
        })
    else:
        yield send("error", {"message": "Something went wrong. Please try again."})


@app.post("/api/plan")
async def plan_trip(req: TripRequest):
    return StreamingResponse(
        stream_trip(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Wanderful Travel Advisor"}
