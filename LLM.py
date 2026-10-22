import os
import time

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()


class RateLimitedLLM:
    """Call the configured provider and surface failures instead of fabricating results."""

    def __init__(self, api_key: str, key_name: str, max_tokens: int, delay_seconds: float = 1.0):
        self.delay_seconds = delay_seconds
        self.key_name = key_name
        self.client = None
        self.configuration_error = None
        self.model = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b").strip()
        self.max_tokens = max_tokens

        if not api_key:
            self.configuration_error = f"{key_name} is not configured. Add it to the backend environment and restart the server."
            return

        try:
            self.client = ChatOpenAI(
                model=self.model,
                temperature=0.7,
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                max_tokens=max_tokens,
                max_retries=0,
            )
        except Exception as exc:
            self.configuration_error = f"Could not initialize the OpenRouter client: {exc}"

    def invoke(self, messages, *args, **kwargs):
        if self.client is None:
            raise RuntimeError(self.configuration_error or "The OpenRouter client is unavailable.")

        time.sleep(self.delay_seconds)
        try:
            return self.client.invoke(messages, *args, **kwargs)
        except Exception as first_error:
            message = str(first_error).lower()
            if any(term in message for term in ("invalid_api_key", "invalid api key", "401", "unauthenticated")):
                raise RuntimeError(f"OpenRouter rejected {self.key_name}. Check the backend environment variable and restart the server.") from first_error
            if "model_not_found" in message or "does not exist or you do not have access" in message:
                raise RuntimeError(
                    f"OpenRouter model {self.model!r} is unavailable. "
                    "Set OPENROUTER_MODEL to a model ID available on OpenRouter, then restart the backend."
                ) from first_error

            transient = any(term in message for term in ("429", "500", "502", "503", "504", "timeout", "timed out", "connection error"))
            if not transient:
                raise RuntimeError(f"OpenRouter request failed: {first_error}") from first_error

            time.sleep(3.0)
            try:
                return self.client.invoke(messages, *args, **kwargs)
            except Exception as retry_error:
                raise RuntimeError(f"OpenRouter request failed after retry: {retry_error}") from retry_error


_KEYS = {
    "primary": ("OPENROUTER_API_KEY", os.getenv("OPENROUTER_API_KEY", "").strip()),
    "secondary": ("OPENROUTER_API_KEY_2", os.getenv("OPENROUTER_API_KEY_2", "").strip()),
}

# Keep the six-call workflow balanced across the two keys. The compiler and
# itinerary get larger output budgets; short research tasks stay tightly capped.
_AGENT_CONFIG = {
    "destination_agent": ("primary", 400),
    "itinerary_agent": ("primary", 550),
    "budget_agent": ("secondary", 350),
    "hotel_agent": ("secondary", 350),
    "weather_agent": ("secondary", 250),
    "compile": ("primary", 900),
}
_clients: dict[tuple[str, int], RateLimitedLLM] = {}


def llm_for_agent(agent_name: str) -> RateLimitedLLM:
    """Return the assigned client, falling back to the other configured key."""
    key_slot, max_tokens = _AGENT_CONFIG[agent_name]
    key_name, api_key = _KEYS[key_slot]
    if not api_key:
        fallback_slot = "secondary" if key_slot == "primary" else "primary"
        fallback_name, fallback_key = _KEYS[fallback_slot]
        if fallback_key:
            key_name, api_key = fallback_name, fallback_key

    cache_key = (key_name, max_tokens)
    if cache_key not in _clients:
        _clients[cache_key] = RateLimitedLLM(api_key, key_name, max_tokens)
    return _clients[cache_key]
