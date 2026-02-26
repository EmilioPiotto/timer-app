import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from .database import get_macros_table
from .models import MacroCreate, MacroResponse


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _item_to_response(item: dict) -> MacroResponse:
    return MacroResponse(
        id=item["id"],
        name=item["name"],
        steps=json.loads(item["steps"]),
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
    )


def list_macros() -> list[MacroResponse]:
    table = get_macros_table()
    result = table.scan()
    return [_item_to_response(item) for item in result.get("Items", [])]


def get_macro(macro_id: str) -> Optional[MacroResponse]:
    table = get_macros_table()
    result = table.get_item(Key={"id": macro_id})
    item = result.get("Item")
    if item is None:
        return None
    return _item_to_response(item)


def create_macro(data: MacroCreate) -> MacroResponse:
    table = get_macros_table()
    now = _now()
    item = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "steps": json.dumps([step.model_dump() for step in data.steps]),
        "createdAt": now,
        "updatedAt": now,
    }
    table.put_item(Item=item)
    return _item_to_response(item)


def update_macro(macro_id: str, data: MacroCreate) -> Optional[MacroResponse]:
    table = get_macros_table()
    existing = table.get_item(Key={"id": macro_id}).get("Item")
    if existing is None:
        return None
    now = _now()
    item = {
        "id": macro_id,
        "name": data.name,
        "steps": json.dumps([step.model_dump() for step in data.steps]),
        "createdAt": existing["createdAt"],
        "updatedAt": now,
    }
    table.put_item(Item=item)
    return _item_to_response(item)


def delete_macro(macro_id: str) -> bool:
    table = get_macros_table()
    existing = table.get_item(Key={"id": macro_id}).get("Item")
    if existing is None:
        return False
    table.delete_item(Key={"id": macro_id})
    return True
