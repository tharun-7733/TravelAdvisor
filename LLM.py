import os
import time

from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()


class RateLimitedLLM:
    """Call the configured provider and surface failures instead of fabricating results."""

    def __init__(self, api_key: str, delay_seconds: float = 1.0):
        self.delay_seconds = delay_seconds
        self.client = None
        self.configuration_error = None
        self.model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()

        if not api_key:
            self.configuration_error = "GROQ_API_KEY is not configured. Add it to the backend environment and restart the server."
            return

        try:
            self.client = ChatGroq(
                model=self.model,
                temperature=0.7,
                api_key=api_key,
                max_tokens=900,
                reasoning_effort="low",
                max_retries=0,
            )
        except Exception as exc:
            self.configuration_error = f"Could not initialize the Groq client: {exc}"

    def invoke(self, messages, *args, **kwargs):
        if self.client is None:
            raise RuntimeError(self.configuration_error or "The Groq client is unavailable.")

        time.sleep(self.delay_seconds)
        try:
            return self.client.invoke(messages, *args, **kwargs)
        except Exception as first_error:
            message = str(first_error).lower()
            if any(term in message for term in ("invalid_api_key", "invalid api key", "401", "unauthenticated")):
                raise RuntimeError("Groq rejected GROQ_API_KEY. Check the backend environment variable and restart the server.") from first_error
            if "model_not_found" in message or "does not exist or you do not have access" in message:
                raise RuntimeError(
                    f"Groq model {self.model!r} is unavailable to this account. "
                    "Set GROQ_MODEL to an active model enabled for your Groq account (for example, openai/gpt-oss-120b), then restart the backend."
                ) from first_error

            time.sleep(3.0)
            try:
                return self.client.invoke(messages, *args, **kwargs)
            except Exception as retry_error:
                raise RuntimeError(f"Groq request failed after retry: {retry_error}") from retry_error


llm = RateLimitedLLM(os.getenv("GROQ_API_KEY", "").strip())
