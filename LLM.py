import os
import re
import time
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY", "").strip()

base_llm = None
if api_key and api_key.startswith("gsk_"):
    try:
        base_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            api_key=api_key,
            max_tokens=900,
            max_retries=1
        )
    except Exception as e:
        print(f"[System] Warning: Could not initialize ChatGroq: {e}")


class MockResponse:
    def __init__(self, content: str):
        self.content = content


def generate_fallback_content(messages) -> str:
    combined = " ".join([getattr(m, "content", str(m)) for m in messages])
    
    # Extract destination
    dest_match = re.search(r"visiting\s+([^.\n]+?)(?:\s+around|\s+with|\.|\n|$)", combined, re.IGNORECASE)
    if not dest_match:
        dest_match = re.search(r"going to\s+([^.\n]+?)(?:\s+around|\s+with|\.|\n|$)", combined, re.IGNORECASE)
    dest = dest_match.group(1).strip() if dest_match else "your destination"

    # Extract dates
    dates_match = re.search(r"around\s+([^.\n]+?)(?:\s+with|\.|\n|$)", combined, re.IGNORECASE)
    dates = dates_match.group(1).strip() if dates_match else "your upcoming trip"

    # Extract travelers
    trav_match = re.search(r"(\d+)\s+traveler", combined, re.IGNORECASE)
    travelers = trav_match.group(1) if trav_match else "1"

    # Extract budget
    budg_match = re.search(r"with a\s+([a-zA-Z0-9_-]+)\s+budget", combined, re.IGNORECASE)
    budget = budg_match.group(1) if budg_match else "mid-range"

    system_text = getattr(messages[0], "content", str(messages[0])).lower() if messages else ""

    if "master travel consultant" in system_text:
        # Compiler / Final Plan
        return f"""# 🌍 Complete Travel Guide: {dest}
**Travelers**: {travelers} | **Dates**: {dates} | **Budget**: {budget.title()}

---

## Welcome to Your Custom Travel Guide
You are in for an incredible experience! {dest} offers a mesmerizing mix of rich history, world-class culinary experiences, and captivating neighborhoods. Whether you're soaking in the culture or savoring street eats, this curated plan gives you the perfect balance of iconic sights and local treasures.

---

### 🗺️ The Highlights & Neighborhood Vibe
- **Cultural Heart**: Wander the central plazas and iconic architectural landmarks in the morning light.
- **Hidden Alleyways**: Duck into side streets for independent coffee roasters, vintage bookstores, and quiet courtyard gardens.
- **Nightlife & Dining**: Savor authentic regional dining in neighborhood bistros where locals gather after work.

---

### 📅 Day-by-Day Experience

#### **Day 1: Arrival & Historic Immersion**
- **Morning**: Unpack and orient yourself with a relaxed stroll through the historic town center.
- **Afternoon**: Discover top museums and scenic viewpoints overlooking the city skyline.
- **Evening**: Enjoy a cozy dinner sampling signature regional appetizers and local wine or cider.

#### **Day 2: Neighborhoods & Hidden Gems**
- **Morning**: Beat the crowds at the city's most famous landmark for photos and serene views.
- **Afternoon**: Explore bohemian quarters filled with galleries, boutique shops, and craft bakeries.
- **Evening**: Dinner at a neighborhood bistro, followed by a lantern-lit evening walk.

#### **Day 3: Nature, Scenic Walks & Celebratory Dinner**
- **Morning**: Take a light hike or riverside promenade with panoramic views.
- **Afternoon**: Pick up artisanal souvenirs and enjoy afternoon tea or pastries.
- **Evening**: A memorable farewell dinner at a top-rated dining spot.

---

### 🏨 Recommended Places to Stay
- **The Heritage Boutique Inn**: Historic central location, walkable to everything, rooftop views (~$140/night).
- **The Arts District Loft**: Trendy, quiet, surrounded by independent cafes (~$175/night).
- **The Scenic Hillside Hotel**: Luxurious relaxation with breathtaking views (~$210/night).

---

### 💰 Budget & Spending Plan ({budget.title()})
- **Daily Food & Coffee**: $40 – $75 per person
- **Local Transit**: $10 – $20 per day
- **Activities & Entrance**: $25 – $50 per day
- *Tip: Tap-to-pay via mobile or contactless credit card is widely accepted everywhere.*

---

### 🌤️ Weather & What to Pack
- **Vibe**: Crisp mornings, comfortable sunny afternoons, cool evenings.
- **Pack**: Comfortable walking shoes, versatile layers, sunglasses, and a light jacket for after sunset.

*Have an unforgettable journey to {dest}! Safe travels!*"""

    elif "travel finance expert" in system_text:
        return f"""### Budget Breakdown ({budget.title()} Tier)
Estimated costs for {travelers} traveler(s) in {dest}:
- **Accommodation**: $120 – $220 / night (charming boutique hotel or central apartment)
- **Dining & Food**: $40 – $75 / day per person (cafes, authentic local restaurants, and casual treats)
- **Local Transportation**: $10 – $20 / day (metro passes, scenic buses, or occasional taxis)
- **Attractions & Activities**: $25 – $50 / day (museum entry, guided walks, boat tours)
- **Estimated Total Daily Cost**: ~$195 – $365 total per day (excluding long-haul flights)
*Pro Tip: Book attraction tickets online 48 hours in advance to skip lines and snag early-bird rates.*"""

    elif "where you sleep" in system_text:
        return f"""### Top 3 Handpicked Accommodations in {dest}
1. **The Heritage Boutique Inn** (Old Town / Central)
   - *Why it stands out*: Classic architecture, rooftop terrace, steps away from main plazas.
   - *Estimated rate*: ~$140 / night.
2. **The Urban Oasis Suites** (Arts & Design District)
   - *Why it stands out*: Sleek minimalist design, quiet street, fantastic espresso bar downstairs.
   - *Estimated rate*: ~$175 / night.
3. **The Scenic Vista Hotel** (Waterfront / Hillside)
   - *Why it stands out*: Panoramic views, serene atmosphere, excellent concierge for local bookings.
   - *Estimated rate*: ~$210 / night."""

    elif "meteorologist" in system_text:
        return f"""### Weather & Packing Insights for {dates} in {dest}
- **Temperatures**: Mild to pleasantly warm during the day (18°C–24°C / 64°F–75°F); cooler evenings around 12°C–16°C (54°F–61°F).
- **Conditions**: Mostly clear skies with occasional brisk breezes.
- **Packing Essentials**:
  - Breathable layers (merino wool or cotton tees + light cardigan/jacket)
  - Broken-in, comfortable walking sneakers
  - UV sunglasses and compact travel umbrella
  - A smart-casual outfit for evening dining."""

    elif "meticulous trip planner" in system_text:
        return f"""### Curated Day-by-Day Itinerary for {dest}
**Day 1: Arrival & Historic Charm**
- **Morning**: Settle in, grab coffee at a scenic neighborhood cafe, and take a walking tour of the historic core.
- **Afternoon**: Visit iconic cultural landmarks and museums.
- **Evening**: Welcome dinner enjoying authentic regional dishes. *Local Tip*: Wander the lantern-lit side streets after 8 PM.

**Day 2: Culture, Art & Scenic Views**
- **Morning**: Early visit to top viewpoints before the mid-day rush.
- **Afternoon**: Discover vibrant local markets and artisanal craft shops.
- **Evening**: Sunset drinks at an open-air terrace followed by regional dining.

**Day 3: Nature, Relaxation & Hidden Corners**
- **Morning**: Scenic stroll through nearby parks or coastal promenades.
- **Afternoon**: Casual exploration of residential art districts and boutique shopping.
- **Evening**: Celebratory farewell dinner at a beloved local culinary institution."""

    else:
        # Default / Destination Expert
        return f"""### Destination Overview: {dest}
{dest} is a captivating destination with a rich tapestry of culture, vibrant street life, and unforgettable scenery.

- **Must-See Highlights**: The historic central district, scenic viewpoints, cultural landmarks, and lively markets.
- **Hidden Gems**: Explore quiet artisan cafes, picturesque back alleys, and scenic neighborhood parks.
- **Local Culture & Etiquette**: Warm and hospitable. Greet locals politely, observe dress codes at sacred sites, and try the local specialties.
- **Best Neighborhoods**: Walkable quarters with boutique shops, historic architecture, and cozy bistros."""


class RateLimitedLLM:
    """Wrapper to add safe retries and fallback generation."""
    def __init__(self, llm, delay_seconds=1.0):
        self.llm = llm
        self.delay_seconds = delay_seconds

    def invoke(self, messages, *args, **kwargs):
        if not self.llm:
            time.sleep(self.delay_seconds)
            return MockResponse(generate_fallback_content(messages))

        try:
            time.sleep(self.delay_seconds)
            return self.llm.invoke(messages, *args, **kwargs)
        except Exception as e:
            err_msg = str(e).lower()
            # If invalid API key or auth failure, don't retry in a loop
            if "invalid_api_key" in err_msg or "invalid api key" in err_msg or "401" in err_msg or "unauthenticated" in err_msg:
                print(f"\n[System] GROQ_API_KEY returned 401 (Invalid API Key). Using fallback response.")
                return MockResponse(generate_fallback_content(messages))
            
            # Rate limit or transient error: try once after short delay
            print(f"\n[System] Groq API warning: {e}. Retrying once...")
            try:
                time.sleep(3.0)
                return self.llm.invoke(messages, *args, **kwargs)
            except Exception as e2:
                print(f"[System] Secondary call failed: {e2}. Using fallback generator.")
                return MockResponse(generate_fallback_content(messages))


llm = RateLimitedLLM(base_llm, delay_seconds=1.0)