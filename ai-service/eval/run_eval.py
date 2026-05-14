#!/usr/bin/env python3
"""
RAGAS Evaluation Script — ERP RAG Chatbot
Chạy: python eval/run_eval.py [--url http://localhost:8001] [--output eval/results.json]

Yêu cầu:
- AI service đang chạy (docker compose up ai-service)
- Ollama đang chạy với model đã pull
- pip install ragas datasets
"""

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any

import requests

# ─── Config ──────────────────────────────────────────────────────────────────

DEFAULT_URL = "http://localhost:8001"
GOLDEN_PATH = Path(__file__).parent / "golden_dataset.json"
RESULTS_PATH = Path(__file__).parent / "results.json"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def call_chat(base_url: str, question: str, department: str, role: str) -> dict[str, Any]:
    """Gọi /chat endpoint và trả về {answer, sources, context_texts, latency_ms}."""
    payload = {"message": question, "department": department, "role": role, "history": []}
    t0 = time.time()
    resp = requests.post(f"{base_url}/chat", json=payload, timeout=120)
    latency_ms = int((time.time() - t0) * 1000)
    resp.raise_for_status()
    data = resp.json()
    return {
        "answer": data.get("answer", ""),
        "sources": data.get("sources", []),
        "context_texts": data.get("context_texts", []),
        "latency_ms": latency_ms,
    }


def score_answer(answer: str, ground_truth: str, question: str) -> dict[str, float]:
    """
    Tính điểm đơn giản không cần LLM judge:
    - keyword_recall: % từ khóa quan trọng trong ground_truth xuất hiện trong answer
    - length_ok: answer có đủ dài không (> 50 chars)
    - not_empty: answer không rỗng và không phải fallback
    """
    FALLBACK_PHRASES = [
        "không tìm thấy thông tin",
        "không có thông tin",
        "liên hệ quản trị viên",
        "không thể đưa ra câu trả lời",
    ]

    answer_lower = answer.lower()
    gt_lower = ground_truth.lower()

    # Keyword recall: lấy các từ quan trọng (>3 ký tự) từ ground_truth
    gt_words = set(w for w in re.findall(r"\w{4,}", gt_lower))
    if gt_words:
        matched = sum(1 for w in gt_words if w in answer_lower)
        keyword_recall = matched / len(gt_words)
    else:
        keyword_recall = 1.0

    not_fallback = not any(p in answer_lower for p in FALLBACK_PHRASES)
    length_ok = len(answer) > 50

    return {
        "keyword_recall": round(keyword_recall, 3),
        "not_fallback": float(not_fallback),
        "length_ok": float(length_ok),
        "composite": round((keyword_recall * 0.6 + float(not_fallback) * 0.3 + float(length_ok) * 0.1), 3),
    }


def run_ragas_eval(samples: list[dict]) -> dict[str, float] | None:
    """
    Chạy RAGAS evaluation nếu có đủ thư viện.
    Dùng Groq làm LLM judge.
    """
    try:
        import os
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import faithfulness, answer_relevancy, context_precision
        from langchain_groq import ChatGroq
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper

        groq_api_key = os.environ.get("GROQ_API_KEY", "")
        groq_model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

        if not groq_api_key:
            print("  [RAGAS] GROQ_API_KEY not set — skipping RAGAS metrics")
            return None

        llm = LangchainLLMWrapper(ChatGroq(api_key=groq_api_key, model_name=groq_model))

        # RAGAS 0.2.x: set LLM trên từng metric object
        for metric in [faithfulness, answer_relevancy, context_precision]:
            metric.llm = llm

        # contexts phải là document text, không phải label strings
        # Lọc samples có context_texts (từ extended API nếu có)
        valid = [s for s in samples if s.get("answer") and s.get("context_texts")]
        if not valid:
            print("  [RAGAS] No samples with context_texts — skipping RAGAS (need /chat to return context_texts)")
            return None

        dataset = Dataset.from_list([
            {
                "question": s["question"],
                "answer": s["answer"],
                "contexts": s["context_texts"],
                "ground_truth": s["ground_truth"],
            }
            for s in valid
        ])

        result = evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_precision])
        return {
            "faithfulness": round(float(result["faithfulness"]), 3),
            "answer_relevancy": round(float(result["answer_relevancy"]), 3),
            "context_precision": round(float(result["context_precision"]), 3),
        }
    except ImportError:
        print("  [RAGAS] ragas/datasets/langchain_groq not installed, skipping RAGAS metrics")
        return None
    except Exception as e:
        print(f"  [RAGAS] Evaluation failed: {e}")
        return None


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="RAGAS Evaluation for ERP RAG Chatbot")
    parser.add_argument("--url", default=DEFAULT_URL, help="AI service base URL")
    parser.add_argument("--output", default=str(RESULTS_PATH), help="Output JSON path")
    parser.add_argument("--ids", nargs="*", help="Run only specific question IDs")
    args = parser.parse_args()

    golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    if args.ids:
        golden = [q for q in golden if q["id"] in args.ids]

    print(f"\n{'='*60}")
    print(f"ERP RAG Evaluation — {len(golden)} questions")
    print(f"AI service: {args.url}")
    print(f"{'='*60}\n")

    results = []
    ragas_samples = []
    total_latency = 0
    passed = 0

    for i, item in enumerate(golden, 1):
        qid = item["id"]
        question = item["question"]
        dept = item["department"]
        role = item["role"]
        gt = item["ground_truth"]

        print(f"[{i:02d}/{len(golden)}] {qid}: {question[:60]}...")

        try:
            resp = call_chat(args.url, question, dept, role)
            answer = resp["answer"]
            sources = resp["sources"]
            context_texts = resp["context_texts"]
            latency = resp["latency_ms"]
            total_latency += latency

            scores = score_answer(answer, gt, question)
            composite = scores["composite"]
            status = "✅ PASS" if composite >= 0.5 else "❌ FAIL"
            if composite >= 0.5:
                passed += 1

            print(f"  {status} | composite={composite:.2f} | keyword_recall={scores['keyword_recall']:.2f} | {latency}ms")
            if composite < 0.5:
                print(f"  Answer: {answer[:120]}...")
                print(f"  Expected: {gt[:120]}...")

            result = {
                "id": qid,
                "question": question,
                "department": dept,
                "role": role,
                "answer": answer,
                "ground_truth": gt,
                "sources": sources,
                "scores": scores,
                "latency_ms": latency,
            }
            results.append(result)

            ragas_samples.append({
                "question": question,
                "answer": answer,
                "context_texts": context_texts,  # actual chunk texts for RAGAS
                "ground_truth": gt,
            })

        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            results.append({"id": qid, "error": str(e)})

    # Summary
    n = len([r for r in results if "scores" in r])
    avg_composite = sum(r["scores"]["composite"] for r in results if "scores" in r) / max(n, 1)
    avg_latency = total_latency / max(n, 1)

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"  Questions evaluated : {n}/{len(golden)}")
    print(f"  Pass rate (≥0.5)    : {passed}/{n} ({100*passed//max(n,1)}%)")
    print(f"  Avg composite score : {avg_composite:.3f}")
    print(f"  Avg latency         : {avg_latency:.0f}ms")

    # RAGAS metrics (optional)
    print(f"\n  Running RAGAS metrics (requires Ollama)...")
    ragas_scores = run_ragas_eval(ragas_samples)
    if ragas_scores:
        print(f"  RAGAS faithfulness      : {ragas_scores['faithfulness']:.3f}")
        print(f"  RAGAS answer_relevancy  : {ragas_scores['answer_relevancy']:.3f}")
        print(f"  RAGAS context_precision : {ragas_scores['context_precision']:.3f}")

    # Save results
    output = {
        "summary": {
            "total": len(golden),
            "evaluated": n,
            "passed": passed,
            "pass_rate": round(passed / max(n, 1), 3),
            "avg_composite": round(avg_composite, 3),
            "avg_latency_ms": round(avg_latency),
            "ragas": ragas_scores,
        },
        "results": results,
    }
    Path(args.output).write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  Results saved → {args.output}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
