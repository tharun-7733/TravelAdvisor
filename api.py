import asyncio
import json
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from graph import build_graph

import os
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Voyaura Travel Advisor API")

# Set CORS_ORIGINS on Render as comma-separated allowed origins
# e.g. CORS_ORIGINS=https://voyaura.vercel.app,https://www.voyaura.com
_raw = os.getenv("CORS_ORIGINS", "https://travel-advisor-zeta.vercel.app/")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
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

    yield send("start", {"message": f"Assembling your travel team for {req.destination}..."})

    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()

    def run_worker():
        try:
            for event in graph.stream(initial_state, stream_mode="values"):
                loop.call_soon_threadsafe(queue.put_nowait, ("event", event))
            loop.call_soon_threadsafe(queue.put_nowait, ("done", None))
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

    worker_thread = threading.Thread(target=run_worker, daemon=True)
    worker_thread.start()

    try:
        while True:
            msg_type, payload = await queue.get()
            if msg_type == "error":
                yield send("error", {"message": f"Planning error: {payload}"})
                return
            elif msg_type == "done":
                break
            elif msg_type == "event":
                event = payload
                newly_completed = set(event.get("completed_agents", [])) - completed_set
                for agent in newly_completed:
                    label = AGENT_LABELS.get(agent, agent)
                    yield send("agent_done", {"agent": agent, "label": label})
                    completed_set.add(agent)
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
            yield send("error", {"message": "Unable to assemble final plan. Please try again."})
    except Exception as e:
        yield send("error", {"message": f"Server error: {str(e)}"})


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


@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Voyaura Travel Advisor"}
