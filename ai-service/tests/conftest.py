"""Pytest fixtures dùng chung cho tất cả test."""

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_groq_client():
    """Mock Groq client để tránh gọi API thật."""
    with patch("groq.Groq") as mock_cls:
        client = MagicMock()
        mock_cls.return_value = client
        yield client


def make_groq_response(content: str = "", tool_calls=None):
    """Tạo mock response giống Groq API trả về."""
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
