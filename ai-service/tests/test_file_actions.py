"""Tests for docs/actions.py file action metadata."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from docs.actions import detect_file_action, detect_file_action_info, get_entity_info


class TestFileActionDetection:
    def test_detect_quotation_request_from_rfq(self):
        info = detect_file_action_info("Tạo yêu cầu báo giá từ file RFQ")
        assert info is not None
        assert info["action"] == "create_quotation_request"
        assert info["tool"] == "create_quotation_request"
        assert info["required_fields"] == ["customerId", "employeeId", "items"]
        assert info["document_type"] == "quotation_request"
        assert detect_file_action("Tạo yêu cầu báo giá từ file RFQ") == "create_quotation_request"

    def test_detect_real_quotation_from_file(self):
        info = detect_file_action_info("Tạo báo giá từ file báo giá đã duyệt")
        assert info is not None
        assert info["action"] == "create_quotation"
        assert info["tool"] == "create_quotation"
        assert info["required_fields"] == ["quotationRequestId"]
        assert info["document_type"] == "quotation"

    def test_detect_quotation_from_accentless_filename_context(self):
        info = detect_file_action_info("tao tu file bao_gia_khach_hang.xlsx")
        assert info is not None
        assert info["action"] == "create_quotation"

    def test_existing_process_detection_still_works(self):
        info = detect_file_action_info("Tạo quy trình từ file")
        assert info is not None
        assert info["action"] == "create_process"
        assert info["tool"] == "create_process"

    def test_get_entity_info_returns_metadata(self):
        info = get_entity_info("create_quotation_request")
        assert info is not None
        assert info["document_type"] == "quotation_request"

    def test_no_action_without_create_keyword(self):
        assert detect_file_action_info("xem file báo giá") is None
