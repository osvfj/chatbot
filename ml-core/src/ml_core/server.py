from fastapi import FastAPI

app = FastAPI(title="ml-core", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "trained": False}


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
