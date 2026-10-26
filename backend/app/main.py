from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.api.router import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ImageRevive")

app = FastAPI(
    title="ImageRevive API",
    description="ImageRevive image enhancement and analysis computational engine API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error on {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal image processing error: {str(exc)}"}
    )

# Include the main router under /api
app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "Welcome to ImageRevive API. Visit /docs for the interactive Swagger documentation.",
        "health": "/api/health",
        "samples": "/api/samples"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
