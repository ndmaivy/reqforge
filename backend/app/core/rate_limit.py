from __future__ import annotations

import threading
import time
from dataclasses import dataclass

from app.core.exceptions import RateLimitExceeded


@dataclass
class Window:
    started_at: float
    count: int


class FixedWindowRateLimiter:
    """Bounded in-memory limiter for the supported single-instance deployment."""

    def __init__(self, max_keys: int = 10_000) -> None:
        self.max_keys = max_keys
        self._windows: dict[str, Window] = {}
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        with self._lock:
            window = self._windows.get(key)
            if window is None or now - window.started_at >= window_seconds:
                self._windows[key] = Window(now, 1)
                self._prune(now, window_seconds)
                return
            if window.count >= limit:
                retry_after = max(1, int(window_seconds - (now - window.started_at)) + 1)
                raise RateLimitExceeded("Rate limit exceeded", {"retry_after": retry_after})
            window.count += 1

    def _prune(self, now: float, window_seconds: int) -> None:
        if len(self._windows) <= self.max_keys:
            return
        expired = [
            key
            for key, window in self._windows.items()
            if now - window.started_at >= window_seconds
        ]
        for key in expired:
            self._windows.pop(key, None)
        if len(self._windows) > self.max_keys:
            oldest = sorted(self._windows, key=lambda key: self._windows[key].started_at)
            for key in oldest[: len(self._windows) - self.max_keys]:
                self._windows.pop(key, None)


def client_ip(request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",", 1)[0].strip()
    if forwarded:
        return forwarded[:64]
    return request.client.host[:64] if request.client else "unknown"
