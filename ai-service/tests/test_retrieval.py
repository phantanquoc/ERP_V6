"""Tests for chat/retrieval.py — semantic cache scoping (L3 fix)."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestSemCacheScope:
    """L3: Semantic cache must be scoped by department:role to prevent cross-dept hits."""

    def setup_method(self):
        """Clear cache before each test."""
        from chat.retrieval import _sem_cache
        _sem_cache.clear()

    def _make_emb(self, val: float) -> list[float]:
        """Make a unit-norm embedding (all same value, normalized)."""
        import math
        dim = 10
        raw = [val] * dim
        norm = math.sqrt(sum(x * x for x in raw))
        return [x / norm for x in raw]

    def test_cache_hit_same_scope(self):
        """Same scope → cache hit."""
        from chat.retrieval import sem_cache_lookup, sem_cache_put
        emb = self._make_emb(1.0)
        sem_cache_put(emb, "Câu trả lời A", ["source.md"], scope="DEPT_BUSINESS:EMPLOYEE")
        result = sem_cache_lookup(emb, scope="DEPT_BUSINESS:EMPLOYEE")
        assert result is not None
        assert result[0] == "Câu trả lời A"

    def test_cache_miss_different_scope(self):
        """Different scope → cache miss even with identical query."""
        from chat.retrieval import sem_cache_lookup, sem_cache_put
        emb = self._make_emb(1.0)
        sem_cache_put(emb, "Câu trả lời A", ["source.md"], scope="DEPT_BUSINESS:EMPLOYEE")
        # Same embedding, different department
        result = sem_cache_lookup(emb, scope="DEPT_TECHNICAL:EMPLOYEE")
        assert result is None

    def test_cache_miss_different_role(self):
        """Different role in same dept → cache miss."""
        from chat.retrieval import sem_cache_lookup, sem_cache_put
        emb = self._make_emb(1.0)
        sem_cache_put(emb, "Câu trả lời A", ["source.md"], scope="DEPT_BUSINESS:EMPLOYEE")
        result = sem_cache_lookup(emb, scope="DEPT_BUSINESS:DEPARTMENT_HEAD")
        assert result is None

    def test_cache_empty_scope_isolated(self):
        """Empty scope entries don't bleed into scoped lookups."""
        from chat.retrieval import sem_cache_lookup, sem_cache_put
        emb = self._make_emb(1.0)
        sem_cache_put(emb, "Câu trả lời chung", ["common.md"], scope="")
        result = sem_cache_lookup(emb, scope="DEPT_QUALITY:EMPLOYEE")
        assert result is None

    def test_multiple_scopes_independent(self):
        """Multiple scopes stored independently."""
        from chat.retrieval import sem_cache_lookup, sem_cache_put
        emb = self._make_emb(1.0)
        sem_cache_put(emb, "Trả lời KD", ["kd.md"], scope="DEPT_BUSINESS:EMPLOYEE")
        sem_cache_put(emb, "Trả lời KT", ["kt.md"], scope="DEPT_TECHNICAL:EMPLOYEE")

        result_kd = sem_cache_lookup(emb, scope="DEPT_BUSINESS:EMPLOYEE")
        result_kt = sem_cache_lookup(emb, scope="DEPT_TECHNICAL:EMPLOYEE")

        assert result_kd is not None and result_kd[0] == "Trả lời KD"
        assert result_kt is not None and result_kt[0] == "Trả lời KT"

    def test_fifo_eviction_respects_max(self):
        """Cache evicts oldest entries when full."""
        from chat.retrieval import sem_cache_lookup, sem_cache_put, _sem_cache
        from config import SEM_CACHE_MAX

        # Fill cache beyond max
        for i in range(SEM_CACHE_MAX + 2):
            emb = self._make_emb(float(i + 1) / (SEM_CACHE_MAX + 2))
            sem_cache_put(emb, f"answer_{i}", [], scope="scope_a")

        assert len(_sem_cache) <= SEM_CACHE_MAX
