import sys
from graph import build_graph


DIVIDER = "\n" + "─" * 70 + "\n"


def ask(prompt: str, default: str = "") -> str:
    user_input = input(prompt).strip()
    return user_input if user_input else default


def print_section(title: str, content: str):
    print(f"\n{'═' * 70}")
    print(f"  {title}")
    print(f"{'═' * 70}")
    print(content)


def main():
    print("\n✈️  Welcome to your Personal AI Travel Advisor")
    print("   Powered by a team of specialized AI agents working just for you.")
    print(DIVIDER)

    destination = ask("Where are you headed? (e.g. Tokyo, Japan): ")
    if not destination:
        print("Please enter a destination to get started.")
        sys.exit(1)

    travel_dates = ask("When are you planning to travel? (e.g. December 2025, 2 weeks): ")
    travelers_raw = ask("How many travelers? [1]: ", default="1")
    travelers = int(travelers_raw) if travelers_raw.isdigit() else 1
    budget = ask("What's your budget level? (budget / mid-range / luxury) [mid-range]: ", default="mid-range")

    print(DIVIDER)
    print("Your travel team is getting to work...")
    print("This usually takes 1-2 minutes — good things take time.\n")

    initial_state = {
        "destination": destination,
        "travelers": travelers,
        "travel_dates": travel_dates,
        "budget": budget,
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

    agent_labels = {
        "destination_agent": "Destination Expert is researching...",
        "itinerary_agent": "Itinerary Planner is building your day-by-day plan...",
        "budget_agent": "Budget Analyst is crunching the numbers...",
        "hotel_agent": "Hotel Scout is finding the best places to stay...",
        "weather_agent": "Weather Advisor is checking the forecast...",
        "compile": "Compiling your complete travel guide...",
    }

    state = initial_state
    completed_set = set()

    for event in graph.stream(initial_state, stream_mode="values"):
        newly_completed = set(event.get("completed_agents", [])) - completed_set
        for agent in newly_completed:
            label = agent_labels.get(agent, f"{agent} done")
            print(f"{label.split('...')[0].strip()} — done")
            completed_set.add(agent)

        if event.get("final_plan"):
            state = event

    print_section("🗺️  YOUR COMPLETE TRAVEL GUIDE", state["final_plan"])

    save = ask("\n\nWould you like to save this travel guide to a file? (yes/no) [yes]: ", default="yes")
    if save.lower() in ("yes", "y", ""):
        filename = f"travel_guide_{destination.replace(' ', '_').replace(',', '')}.txt"
        with open(filename, "w") as f:
            f.write(f"Travel Guide: {destination}\n")
            f.write(f"Travelers: {travelers} | Dates: {travel_dates} | Budget: {budget}\n")
            f.write("=" * 70 + "\n\n")
            f.write(state["final_plan"])
        print(f"\nSaved to: {filename}")

    print("\nSafe travels! Your adventure awaits.\n")


if __name__ == "__main__":
    main()
