"""Motor de reglas de negocio (lógica proposicional y de primer orden).

Evalúa hechos del usuario contra reglas con condiciones compuestas (AND / OR /
NOT) y operadores de comparación (equals, gt, gte, lt, lte, ne, is_true,
is_false). Devuelve las reglas aplicadas con su explicación en lenguaje natural,
lo que da trazabilidad a las decisiones del chatbot.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _evaluate(condition: dict[str, Any], facts: dict[str, Any]) -> bool:
    if "and" in condition:
        return all(_evaluate(sub, facts) for sub in condition["and"])
    if "or" in condition:
        return any(_evaluate(sub, facts) for sub in condition["or"])
    if "not" in condition:
        return not _evaluate(condition["not"], facts)

    fact = facts.get(condition["fact"])

    if "is_true" in condition:
        return bool(fact) is bool(condition["is_true"])
    if "is_false" in condition:
        return bool(fact) is not bool(condition["is_false"])
    if "equals" in condition:
        return fact == condition["equals"]
    if "ne" in condition:
        return fact != condition["ne"]
    if "gt" in condition:
        return _num(fact) > _num(condition["gt"])
    if "gte" in condition:
        return _num(fact) >= _num(condition["gte"])
    if "lt" in condition:
        return _num(fact) < _num(condition["lt"])
    if "lte" in condition:
        return _num(fact) <= _num(condition["lte"])
    return False


def _num(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("-inf")


def _render(condition: dict[str, Any]) -> str:
    if "and" in condition:
        return " Y ".join(f"({_render(sub)})" for sub in condition["and"])
    if "or" in condition:
        return " O ".join(f"({_render(sub)})" for sub in condition["or"])
    if "not" in condition:
        return f"NO ({_render(condition['not'])})"

    fact = condition["fact"]
    if "is_true" in condition:
        return f"{fact} es verdadero" if condition["is_true"] else f"{fact} no es verdadero"
    if "is_false" in condition:
        return f"{fact} es falso" if condition["is_false"] else f"{fact} no es falso"
    if "equals" in condition:
        return f"{fact} = {condition['equals']}"
    if "ne" in condition:
        return f"{fact} ≠ {condition['ne']}"
    if "gt" in condition:
        return f"{fact} > {condition['gt']}"
    if "gte" in condition:
        return f"{fact} ≥ {condition['gte']}"
    if "lt" in condition:
        return f"{fact} < {condition['lt']}"
    if "lte" in condition:
        return f"{fact} ≤ {condition['lte']}"
    return fact


class RuleEngine:
    def __init__(self, path: Path = DATA_DIR / "rules.json") -> None:
        self.rules = json.loads(path.read_text(encoding="utf-8"))

    def evaluate(self, facts: dict[str, Any]) -> dict:
        applied = []
        for rule in self.rules:
            if _evaluate(rule["condition"], facts):
                applied.append(
                    {
                        "id": rule["id"],
                        "name": rule["name"],
                        "conclusion": rule["conclusion"],
                        "priority": rule["priority"],
                        "explanation": f"Se cumple: {_render(rule['condition'])}",
                    }
                )
        applied.sort(key=lambda r: r["priority"])
        return {
            "applied": applied,
            "conclusion": applied[0]["conclusion"] if applied else None,
        }
