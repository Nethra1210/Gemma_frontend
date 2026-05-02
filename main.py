from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx, os, json
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST  = os.getenv("OLLAMA_HOST")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL")
OLLAMA_KEY   = os.getenv("OLLAMA_API_KEY")

app = FastAPI(title="Gemma4 Chat Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    model: str = None # Optional model parameter

@app.post("/chat")
def chat(req: ChatRequest):
    try:
        # Determine Auth Header
        if OLLAMA_KEY and ":" in OLLAMA_KEY:
            import base64
            auth_encoded = base64.b64encode(OLLAMA_KEY.encode("ascii")).decode("ascii")
            auth_header = f"Basic {auth_encoded}"
        else:
            auth_header = f"Bearer {OLLAMA_KEY}"

        # Use request model if provided, else use default from env
        target_model = req.model if req.model else OLLAMA_MODEL
        print(f"Sending request to: {OLLAMA_HOST}/api/chat with model: {target_model}")
        
        with httpx.Client(timeout=120) as client:
            r = client.post(
                f"{OLLAMA_HOST}/api/chat",
                json={
                    "model": target_model,
                    "messages": [{"role": "user", "content": req.message}],
                    "stream": False,
                },
                headers={"Authorization": auth_header},
            )
            
            if r.status_code != 200:
                print(f"Ollama Error ({r.status_code}): {r.text}")
                raise HTTPException(status_code=r.status_code, detail=f"Ollama error: {r.text}")

            try:
                data = r.json()
                content = data.get("message", {}).get("content", "")
                return {"response": content}
            except Exception as parse_err:
                print(f"Parse Error: {str(parse_err)} | Raw Response: {r.text}")
                # Fallback for line-delimited JSON
                lines = [l for l in r.text.strip().splitlines() if l.strip()]
                parsed = [json.loads(l) for l in lines]
                content = "".join(p.get("message", {}).get("content", "") for p in parsed)
                return {"response": content}

    except httpx.ConnectError:
        print(f"Connection Error: Could not connect to {OLLAMA_HOST}")
        raise HTTPException(status_code=503, detail=f"Cannot reach Ollama at {OLLAMA_HOST}")
    except Exception as e:
        print(f"Global Server Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
def list_models():
    try:
        with httpx.Client() as client:
            r = client.get(f"{OLLAMA_HOST}/api/tags")
            return r.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
def health():
    return {"status": "ok", "model": OLLAMA_MODEL}

# Serve React built files if present, otherwise fallback to basic static files
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    if not os.path.exists("static"):
        os.makedirs("static")
    app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
