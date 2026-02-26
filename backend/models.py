from __future__ import annotations

from typing import Annotated, List, Literal, Optional, Union

from pydantic import BaseModel, Field, model_validator


class BeepStep(BaseModel):
    type: Literal["BEEP"]
    soundId: Literal["beep1", "beep2", "bell"]
    volume: float = Field(ge=0.0, le=1.0)


class WaitStep(BaseModel):
    type: Literal["WAIT"]
    seconds: int = Field(ge=1, le=3600)


Step = Annotated[Union[BeepStep, WaitStep], Field(discriminator="type")]


class MacroSlot(BaseModel):
    macroId: str
    loopMode: Literal["FIXED_CYCLES", "FIXED_MINUTES", "AUTO"]
    loopCycles: Optional[int] = Field(default=None, ge=1)
    loopMinutes: Optional[float] = Field(default=None, ge=0.5)

    @model_validator(mode="after")
    def check_loop_fields(self) -> MacroSlot:
        if self.loopMode == "FIXED_CYCLES" and self.loopCycles is None:
            raise ValueError("loopCycles is required when loopMode is FIXED_CYCLES")
        if self.loopMode == "FIXED_MINUTES" and self.loopMinutes is None:
            raise ValueError("loopMinutes is required when loopMode is FIXED_MINUTES")
        return self


class MacroCreate(BaseModel):
    name: str
    steps: List[Step]


class MacroResponse(BaseModel):
    id: str
    name: str
    steps: List[Step]
    createdAt: str
    updatedAt: str


class MacroSlotResponse(BaseModel):
    macroId: str
    loopMode: Literal["FIXED_CYCLES", "FIXED_MINUTES", "AUTO"]
    loopCycles: Optional[int] = None
    loopMinutes: Optional[float] = None
    macro: MacroResponse


class TimerCreate(BaseModel):
    name: str
    totalMinutes: int = Field(ge=1)
    slots: List[MacroSlot]


class TimerResponse(BaseModel):
    id: str
    name: str
    totalMinutes: int
    slots: List[MacroSlotResponse]
    createdAt: str
    updatedAt: str


class TimerListItem(BaseModel):
    id: str
    name: str
    totalMinutes: int
    createdAt: str
    updatedAt: str
