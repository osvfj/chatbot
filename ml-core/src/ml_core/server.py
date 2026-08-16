"""Servidor FastAPI del núcleo de razonamiento clásico de Cafebot.

Sidecar HTTP que expone los componentes clásicos de IA (búsqueda, reglas, PLN,
clasificadores y aprendizaje por refuerzo) para ser consumido por la app de
escritorio. Escucha en http://127.0.0.1:8765.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .core.classifiers import ClassifierBundle
from .core.rl import QLearner
from .core.rules import RuleEngine
from .core.search import KnowledgeGraph
from .core.sentiment import analyze as analyze_sentiment

bundle = ClassifierBundle()
knowledge = KnowledgeGraph()
rules = RuleEngine()
learner = QLearner()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    bundle.train()
    yield


app = FastAPI(title="ml-core", version="0.1.0", lifespan=lifespan)


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class SearchRequest(TextRequest):
    algorithm: Literal["bfs", "dfs", "astar"] = "astar"


class FactsRequest(BaseModel):
    facts: dict[str, object] = Field(default_factory=dict)


class RateRequest(BaseModel):
    state: str = Field(..., min_length=1)
    action: Literal["kb", "tree", "llm"]
    reward: float = Field(..., ge=-1.0, le=1.0)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "trained": bundle.trained}


@app.post("/intent")
def intent(request: TextRequest) -> dict:
    prediction = bundle.predict(request.text)
    return {
        "text": request.text,
        **prediction,
    }


@app.post("/sentiment")
def sentiment(request: TextRequest) -> dict:
    return {"text": request.text, **analyze_sentiment(request.text)}


@app.post("/search")
def search(request: SearchRequest) -> dict:
    return knowledge.search(request.text, request.algorithm)


@app.post("/rules")
def rules_endpoint(request: FactsRequest) -> dict:
    return rules.evaluate(request.facts)


@app.post("/rate")
def rate(request: RateRequest) -> dict:
    learner.update(request.state, request.action, request.reward)
    learner.record(request.state, request.action, request.reward)
    return {
        "state": request.state,
        "action": request.action,
        "reward": request.reward,
        "q": learner.q.get(request.state, {}),
    }


@app.post("/choose")
def choose(request: TextRequest) -> dict:
    prediction = bundle.predict(request.text)
    state = prediction["ensemble"]
    action = learner.choose(state)
    return {"state": state, "action": action, "intent": prediction}


@app.post("/perceptron")
def perceptron(request: TextRequest) -> dict:
    prediction = bundle.predict(request.text)
    return {
        "text": request.text,
        "label": prediction["mlp"]["intent"],
        "confidence": prediction["mlp"]["confidence"],
    }


@app.get("/metrics")
def metrics() -> dict:
    return {"dataset_size": len(bundle.texts), "classes": bundle.classes, "results": bundle.metrics()}


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)


if __name__ == "__main__":
    main()
