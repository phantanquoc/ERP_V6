"""Pytest fixtures dùng chung cho tất cả test."""

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_openrouter_client():
    """Mock OpenRouter client để tránh gọi API thật."""
    with patch("agent.executor._openrouter_client") as client:
        yield client


def make_llm_response(content: str = "", tool_calls=None):
    """Tạo mock response giống OpenAI API trả về."""
    choice = MagicMock()
    choice.message.content = content
    choice.message.tool_calls = tool_calls or []
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def make_tool_call(name: str, arguments: dict):
    """Tạo mock tool_call object."""
    import json
    tc = MagicMock()
    tc.function.name = name
    tc.function.arguments = json.dumps(arguments)
    return tc
