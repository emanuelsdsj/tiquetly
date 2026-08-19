from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.catalog import router as catalog_router
from app.api.routes.events import router as events_router
from app.api.routes.reservations import router as reservations_router
from app.api.routes.tickets import router as tickets_router
from app.core.config import settings
from app.core.errors import AppError

app = FastAPI(title="Tiquetly")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code, "params": exc.params},
    )


@app.exception_handler(RequestValidationError)
def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI's default 422 body is {"detail": [{...}, ...]}, an array of
    # error objects, not the {"detail": str, "code", "params"} shape every
    # other error on this API uses (see AppError). Left unhandled, the
    # frontend renders that array wherever it expects a string ("[object
    # Object]"). Normalize to the same shape here so Pydantic validation
    # failures (missing/invalid fields) behave like every other error.
    first = exc.errors()[0]
    field = ".".join(str(part) for part in first["loc"] if part not in ("body", "query", "path"))
    message = f"{field}: {first['msg']}" if field else first["msg"]
    return JSONResponse(
        status_code=422,
        content={"detail": message, "code": "VALIDATION_ERROR", "params": {"field": field}},
    )


app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(events_router)
app.include_router(reservations_router)
app.include_router(tickets_router)


@app.get("/health")
def health():
    return {"status": "ok"}
