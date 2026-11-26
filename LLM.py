import os
import logging
import time

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
logger = logging.getLogger(__name__)


class RateLimitedLLM:
    """Call the configured provider and surface failures instead of fabricating results."""

    def __init__(self, api_key: str, key_name: str, max_tokens: int, delay_seconds: float = 1.0, configuration_error: str | None = None):
        self.delay_seconds = delay_seconds
        self.key_name = key_name
        self.client = None
        self.configuration_error = None
        self.model = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b").strip()
        self.max_tokens = max_tokens

        if not api_key or configuration_error:
            self.configuration_error = configuration_error or f"{key_name} is not configured. Add it to the backend environment and restart the server."
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

    def _ensure_client(self):
        if self.client is None:
            raise RuntimeError(self.configuration_error or "The OpenRouter client is unavailable.")

    def invoke(self, messages, *args, **kwargs):
        self._ensure_client()
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

    def bind_tools(self, tools):
        """Return a copy of this wrapper whose underlying ChatOpenAI has tools bound."""
        self._ensure_client()
        bound = _ToolBoundLLM(self, tools)
        return bound


class _ToolBoundLLM:
    """Thin wrapper that delegates .invoke() to a tool-bound ChatOpenAI but
    keeps the rate-limiting and retry logic from RateLimitedLLM."""

    def __init__(self, parent: RateLimitedLLM, tools: list):
        self._parent = parent
        self._bound_client = parent.client.bind_tools(tools)
        self.key_name = parent.key_name

    def invoke(self, messages, *args, **kwargs):
        self._parent._ensure_client()
        time.sleep(self._parent.delay_seconds)
        try:
            return self._bound_client.invoke(messages, *args, **kwargs)
        except Exception as first_error:
            message = str(first_error).lower()
            if any(term in message for term in ("invalid_api_key", "invalid api key", "401", "unauthenticated")):
                raise RuntimeError(f"OpenRouter rejected {self.key_name}. Check the backend environment variable.") from first_error
            transient = any(term in message for term in ("429", "500", "502", "503", "504", "timeout", "timed out", "connection error"))
            if not transient:
                raise RuntimeError(f"OpenRouter request failed: {first_error}") from first_error
            time.sleep(3.0)
            try:
                return self._bound_client.invoke(messages, *args, **kwargs)
            except Exception as retry_error:
                raise RuntimeError(f"OpenRouter request failed after retry: {retry_error}") from retry_error


_KEYS = {
    "primary": ("OPENROUTER_API_KEY", os.getenv("OPENROUTER_API_KEY", "").strip()),
    "secondary": ("OPENROUTER_API_KEY_2", os.getenv("OPENROUTER_API_KEY_2", "").strip()),
}

# Keep specialist calls split across both keys. The itinerary gets extra room
# for longer trips; the remaining tasks stay concise.
_AGENT_CONFIG = {
    "destination_agent": ("primary", 500),
    "itinerary_agent": ("secondary", 1800),
    "budget_agent": ("primary", 400),
    "hotel_agent": ("primary", 450),
    "weather_agent": ("secondary", 350),
}
_clients: dict[tuple[str, int], RateLimitedLLM] = {}


def llm_for_agent(agent_name: str) -> RateLimitedLLM:
    """Return the client assigned to this agent; never silently reuse the other key."""
    key_slot, max_tokens = _AGENT_CONFIG[agent_name]
    key_name, api_key = _KEYS[key_slot]
    configuration_error = None
    if not api_key:
        configuration_error = f"{key_name} is required for {agent_name}. Configure it in the backend environment and restart the server."
    elif key_slot == "secondary" and _KEYS["primary"][1] and api_key == _KEYS["primary"][1]:
        configuration_error = "OPENROUTER_API_KEY_2 must contain a different key from OPENROUTER_API_KEY."

    cache_key = (key_name, max_tokens)
    if cache_key not in _clients:
        _clients[cache_key] = RateLimitedLLM(api_key if not configuration_error else "", key_name, max_tokens, configuration_error=configuration_error)
    logger.info("Routing %s through %s", agent_name, key_name)
    return _clients[cache_key]


def llm_with_tools(agent_name: str):
    """Return an LLM client with the agent's tools already bound for tool-calling."""
    from agents.tools import AGENT_TOOLS
    llm = llm_for_agent(agent_name)
    tools = AGENT_TOOLS.get(agent_name, [])
    if tools:
        return llm.bind_tools(tools), tools
    return llm, []
