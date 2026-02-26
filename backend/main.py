from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from . import crud_macros, crud_timers
from .database import init_tables
from .models import (
    MacroCreate,
    MacroResponse,
    TimerCreate,
    TimerListItem,
    TimerResponse,
)
from .templates import MACRO_TEMPLATES, TIMER_TEMPLATES


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_tables()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Macros ---

@app.get("/api/macros", response_model=List[MacroResponse])
def list_macros():
    return crud_macros.list_macros()


@app.post("/api/macros", response_model=MacroResponse, status_code=201)
def create_macro(data: MacroCreate):
    return crud_macros.create_macro(data)


@app.get("/api/macros/{macro_id}", response_model=MacroResponse)
def get_macro(macro_id: str):
    macro = crud_macros.get_macro(macro_id)
    if macro is None:
        raise HTTPException(status_code=404, detail="Macro not found")
    return macro


@app.put("/api/macros/{macro_id}", response_model=MacroResponse)
def update_macro(macro_id: str, data: MacroCreate):
    macro = crud_macros.update_macro(macro_id, data)
    if macro is None:
        raise HTTPException(status_code=404, detail="Macro not found")
    return macro


@app.delete("/api/macros/{macro_id}", status_code=204)
def delete_macro(macro_id: str):
    found = crud_macros.delete_macro(macro_id)
    if not found:
        raise HTTPException(status_code=404, detail="Macro not found")
    return Response(status_code=204)


# --- Timers ---

@app.get("/api/timers", response_model=List[TimerListItem])
def list_timers():
    return crud_timers.list_timers()


@app.post("/api/timers", response_model=TimerResponse, status_code=201)
def create_timer(data: TimerCreate):
    return crud_timers.create_timer(data)


@app.get("/api/timers/{timer_id}", response_model=TimerResponse)
def get_timer(timer_id: str):
    try:
        timer = crud_timers.get_timer(timer_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if timer is None:
        raise HTTPException(status_code=404, detail="Timer not found")
    return timer


@app.put("/api/timers/{timer_id}", response_model=TimerResponse)
def update_timer(timer_id: str, data: TimerCreate):
    try:
        timer = crud_timers.update_timer(timer_id, data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if timer is None:
        raise HTTPException(status_code=404, detail="Timer not found")
    return timer


@app.delete("/api/timers/{timer_id}", status_code=204)
def delete_timer(timer_id: str):
    found = crud_timers.delete_timer(timer_id)
    if not found:
        raise HTTPException(status_code=404, detail="Timer not found")
    return Response(status_code=204)


# --- Templates ---

@app.get("/api/templates/macros")
def get_macro_templates():
    return list(MACRO_TEMPLATES.values())


@app.get("/api/templates/timers")
def get_timer_templates():
    return TIMER_TEMPLATES
