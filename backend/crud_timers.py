import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from . import crud_macros
from .database import get_timers_table
from .models import MacroSlotResponse, TimerCreate, TimerListItem, TimerResponse


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _expand_slots(slots_json: str) -> list[MacroSlotResponse]:
    expanded = []
    for slot_data in json.loads(slots_json):
        macro = crud_macros.get_macro(slot_data["macroId"])
        if macro is None:
            raise ValueError(f"Macro {slot_data['macroId']} not found")
        expanded.append(MacroSlotResponse(**slot_data, macro=macro))
    return expanded


def _item_to_response(item: dict) -> TimerResponse:
    return TimerResponse(
        id=item["id"],
        name=item["name"],
        totalMinutes=int(item["totalMinutes"]),
        slots=_expand_slots(item["slots"]),
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
    )


def _item_to_list_item(item: dict) -> TimerListItem:
    return TimerListItem(
        id=item["id"],
        name=item["name"],
        totalMinutes=int(item["totalMinutes"]),
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
    )


def list_timers() -> list[TimerListItem]:
    table = get_timers_table()
    result = table.scan()
    return [_item_to_list_item(item) for item in result.get("Items", [])]


def get_timer(timer_id: str) -> Optional[TimerResponse]:
    table = get_timers_table()
    result = table.get_item(Key={"id": timer_id})
    item = result.get("Item")
    if item is None:
        return None
    return _item_to_response(item)


def create_timer(data: TimerCreate) -> TimerResponse:
    table = get_timers_table()
    now = _now()
    timer_id = str(uuid.uuid4())
    item = {
        "id": timer_id,
        "name": data.name,
        "totalMinutes": data.totalMinutes,
        "slots": json.dumps([slot.model_dump() for slot in data.slots]),
        "createdAt": now,
        "updatedAt": now,
    }
    table.put_item(Item=item)
    return get_timer(timer_id)


def update_timer(timer_id: str, data: TimerCreate) -> Optional[TimerResponse]:
    table = get_timers_table()
    existing = table.get_item(Key={"id": timer_id}).get("Item")
    if existing is None:
        return None
    now = _now()
    item = {
        "id": timer_id,
        "name": data.name,
        "totalMinutes": data.totalMinutes,
        "slots": json.dumps([slot.model_dump() for slot in data.slots]),
        "createdAt": existing["createdAt"],
        "updatedAt": now,
    }
    table.put_item(Item=item)
    return get_timer(timer_id)


def delete_timer(timer_id: str) -> bool:
    table = get_timers_table()
    existing = table.get_item(Key={"id": timer_id}).get("Item")
    if existing is None:
        return False
    table.delete_item(Key={"id": timer_id})
    return True
