from contextlib import asynccontextmanager

from fastapi import FastAPI

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
async def lifespan(_app):
    bundle.train()
    yield


app = FastAPI(title="ml-core", version="0.1.0", lifespan=lifespan)

ALGORITHMS = ("bfs", "dfs", "astar")


@app.get("/health")
def health():
    return {"status": "ok", "trained": bundle.trained}


@app.post("/intent")
def intent(body: dict):
    text = str(body.get("text", ""))
    return {"text": text, **bundle.predict(text)}


@app.post("/sentiment")
def sentiment(body: dict):
    text = str(body.get("text", ""))
    return {"text": text, **analyze_sentiment(text)}


@app.post("/search")
def search(body: dict):
    text = str(body.get("text", ""))
    algorithm = body.get("algorithm", "astar")
    if algorithm not in ALGORITHMS:
        algorithm = "astar"
    return knowledge.search(text, algorithm)


@app.post("/rules")
def rules_endpoint(body: dict):
    facts = body.get("facts", {})
    if not isinstance(facts, dict):
        facts = {}
    return rules.evaluate(facts)


@app.post("/rate")
def rate(body: dict):
    state = str(body.get("state", ""))
    action = body.get("action", "llm")
    if action not in ("kb", "tree", "llm"):
        action = "llm"
    reward = float(body.get("reward", 0.0))
    learner.update(state, action, reward)
    learner.record(state, action, reward)
    return {"state": state, "action": action, "reward": reward, "q": learner.q.get(state, {})}


@app.post("/choose")
def choose(body: dict):
    text = str(body.get("text", ""))
    prediction = bundle.predict(text)
    state = prediction["ensemble"]
    action = learner.choose(state)
    return {"state": state, "action": action, "intent": prediction}


@app.post("/perceptron")
def perceptron(body: dict):
    text = str(body.get("text", ""))
    prediction = bundle.predict(text)
    return {"text": text, "label": prediction["mlp"]["intent"], "confidence": prediction["mlp"]["confidence"]}


@app.get("/metrics")
def metrics():
    return {"dataset_size": len(bundle.texts), "classes": bundle.classes, "results": bundle.metrics()}


def main():
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)


if __name__ == "__main__":
    main()
