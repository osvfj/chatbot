import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("-inf")


def _evaluate(condition, facts):
    if "and" in condition:
        return all(_evaluate(sub, facts) for sub in condition["and"])
    if "or" in condition:
        return any(_evaluate(sub, facts) for sub in condition["or"])
    if "not" in condition:
        return not _evaluate(condition["not"], facts)

    fact = facts.get(condition["fact"])
    comparison_ops = ("equals", "ne", "gt", "gte", "lt", "lte")
    if condition["fact"] not in facts and any(op in condition for op in comparison_ops):
        return False

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


def _render(condition):
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
    def __init__(self, path=DATA_DIR / "rules.json"):
        self.rules = json.loads(path.read_text(encoding="utf-8"))

    def evaluate(self, facts):
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
        return {"applied": applied, "conclusion": applied[0]["conclusion"] if applied else None}
