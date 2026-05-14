"""Test agent/classifier.py — mock Groq API."""

import sys
import os
import json
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import module trước để patch hoạt động đúng
import agent.classifier as classifier_module


def _make_groq_response(content: str):
    choice = MagicMock()
    choice.message.content = content
    resp = MagicMock()
    resp.choices = [choice]
    return resp


class TestClassifyIntent:
    def _call_with_mock(self, mock_content: str, message: str):
        """Helper: patch _client trực tiếp trên module và gọi classify_intent."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_groq_response(mock_content)
        original = classifier_module._client
        classifier_module._client = mock_client
        try:
            return classifier_module.classify_intent(message)
        finally:
            classifier_module._client = original

    def test_xem_cham_cong_tra_action_attendance(self):
        result = self._call_with_mock(
            '{"intent":"action","category":"attendance"}',
            "xem chấm công tuần này",
        )
        assert result["intent"] == "action"
        assert result["category"] == "attendance"

    def test_huong_dan_nghi_phep_tra_rag_leave(self):
        result = self._call_with_mock(
            '{"intent":"rag","category":"leave"}',
            "hướng dẫn tạo đơn nghỉ phép",
        )
        assert result["intent"] == "rag"
        assert result["category"] == "leave"

    def test_xin_chao_tra_ambiguous_general(self):
        result = self._call_with_mock(
            '{"intent":"ambiguous","category":"general"}',
            "xin chào",
        )
        assert result["intent"] == "ambiguous"
        assert result["category"] == "general"

    def test_json_trong_text_duoc_parse_dung(self):
        """Model đôi khi trả về text bao quanh JSON."""
        result = self._call_with_mock(
            'Đây là kết quả: {"intent":"action","category":"order"} xong.',
            "xem đơn hàng",
        )
        assert result["intent"] == "action"
        assert result["category"] == "order"

    def test_groq_loi_default_rag(self):
        """Khi Groq API ném exception → fallback về rag."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("API timeout")
        original = classifier_module._client
        classifier_module._client = mock_client
        try:
            result = classifier_module.classify_intent("bất kỳ câu hỏi nào")
        finally:
            classifier_module._client = original
        assert result["intent"] == "rag"
        assert result["category"] == "general"

    def test_groq_tra_json_sai_intent_tra_ambiguous(self):
        """JSON hợp lệ nhưng intent không nằm trong tập cho phép."""
        result = self._call_with_mock(
            '{"intent":"unknown_value","category":"general"}',
            "câu hỏi lạ",
        )
        assert result["intent"] == "ambiguous"
        assert result["category"] == "general"

    def test_client_none_default_rag(self):
        """Khi _client là None (không có API key) → fallback về rag."""
        original = classifier_module._client
        classifier_module._client = None
        try:
            result = classifier_module.classify_intent("test message")
        finally:
            classifier_module._client = original
        assert result["intent"] == "rag"
        assert result["category"] == "general"
