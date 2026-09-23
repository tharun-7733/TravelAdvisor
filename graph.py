from typing import TypedDict
from langgraph.graph import StateGraph, END

from agents.supervisor import run_supervisor, compile_final_plan
from agents.destination_agent import run_destination_agent
from agents.itinerary_agent import run_itinerary_agent
from agents.budget_agent import run_budget_agent
from agents.hotel_agent import run_hotel_agent
from agents.weather_agent import run_weather_agent


class TravelState(TypedDict):
    destination: str
    travelers: int
    travel_dates: str
    budget: str
    destination_info: str
    itinerary: str
    budget_estimate: str
    hotel_recommendations: str
    weather_info: str
    final_plan: str
    next: str
    completed_agents: list


def wrap_agent(agent_fn, agent_name: str):
    def node(state: TravelState) -> TravelState:
        result = agent_fn(state)
        completed = result.get("completed_agents", list(state.get("completed_agents", [])))
        if agent_name not in completed:
            completed = completed + [agent_name]
        return {**result, "completed_agents": completed}
    return node


def route_next(state: TravelState) -> str:
    return state.get("next", "FINISH")


def build_graph():
    graph = StateGraph(TravelState)

    graph.add_node("supervisor", run_supervisor)
    graph.add_node("destination_agent", wrap_agent(run_destination_agent, "destination_agent"))
    graph.add_node("itinerary_agent", wrap_agent(run_itinerary_agent, "itinerary_agent"))
    graph.add_node("budget_agent", wrap_agent(run_budget_agent, "budget_agent"))
    graph.add_node("hotel_agent", wrap_agent(run_hotel_agent, "hotel_agent"))
    graph.add_node("weather_agent", wrap_agent(run_weather_agent, "weather_agent"))
    graph.add_node("compile", compile_final_plan)

    graph.set_entry_point("supervisor")

    graph.add_conditional_edges(
        "supervisor",
        route_next,
        {
            "destination_agent": "destination_agent",
            "itinerary_agent": "itinerary_agent",
            "budget_agent": "budget_agent",
            "hotel_agent": "hotel_agent",
            "weather_agent": "weather_agent",
            "compile": "compile",
            "FINISH": END,
        }
    )

    for agent in ["destination_agent", "itinerary_agent", "budget_agent", "hotel_agent", "weather_agent"]:
        graph.add_edge(agent, "supervisor")

    graph.add_edge("compile", "supervisor")

    return graph.compile()
