from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.sentiment import analyze as analyze_sentiment
from .db import init_db
from .routes import albums, auth, chat, chats
from .services import bundle, knowledge, learner, rules


@asynccontextmanager
async def lifespan(_app):
    init_db()
    bundle.train()
    yield


app = FastAPI(title="ml-core", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(chats.router)
app.include_router(albums.router)
app.include_router(chat.router)

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
