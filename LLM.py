import os
import time
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

base_llm = ChatGroq(
    model="qwen/qwen3.8-27b",
    temperature=0.7,
    api_key=api_key,
    max_tokens=900,
    max_retries=10
)

class RateLimitedLLM:
    """Wrapper to add a delay between API calls to avoid rate limits on free tiers."""
    def __init__(self, llm, delay_seconds=5.0):
        self.llm = llm
        self.delay_seconds = delay_seconds

    def invoke(self, *args, **kwargs):
        # Wait before every call to prevent hitting the RPM limit
        print(f"\n[System] Throttling for {self.delay_seconds}s to respect Groq Free Tier limits...")
        time.sleep(self.delay_seconds)
        
        max_attempts = 5
        for attempt in range(max_attempts):
            try:
                return self.llm.invoke(*args, **kwargs)
            except Exception as e:
                wait_time = 15 * (attempt + 1)
                print(f"\n[System] API Error: {e}")
                print(f"[System] Retrying in {wait_time}s (Attempt {attempt+1}/{max_attempts})...")
                time.sleep(wait_time)
                
        return self.llm.invoke(*args, **kwargs)

llm = RateLimitedLLM(base_llm, delay_seconds=10.0)