MACRO_TEMPLATES = {
    "tmpl-macro-tabata": {
        "id": "tmpl-macro-tabata",
        "name": "Tabata interval",
        "steps": [
            {"type": "BEEP", "soundId": "beep1", "volume": 0.8},
            {"type": "WAIT", "seconds": 20},
            {"type": "BEEP", "soundId": "beep2", "volume": 0.8},
            {"type": "WAIT", "seconds": 10},
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
    "tmpl-macro-emom": {
        "id": "tmpl-macro-emom",
        "name": "EMOM minute",
        "steps": [
            {"type": "BEEP", "soundId": "bell", "volume": 0.8},
            {"type": "WAIT", "seconds": 60},
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
    "tmpl-macro-workrest": {
        "id": "tmpl-macro-workrest",
        "name": "Work/Rest 15/45",
        "steps": [
            {"type": "BEEP", "soundId": "beep1", "volume": 0.8},
            {"type": "WAIT", "seconds": 15},
            {"type": "BEEP", "soundId": "beep2", "volume": 0.8},
            {"type": "WAIT", "seconds": 45},
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
}

TIMER_TEMPLATES = [
    {
        "id": "tmpl-timer-tabata20",
        "name": "Quick Tabata 20min",
        "totalMinutes": 20,
        "slots": [
            {
                "macroId": "tmpl-macro-emom",
                "loopMode": "FIXED_MINUTES",
                "loopCycles": None,
                "loopMinutes": 2.0,
                "macro": MACRO_TEMPLATES["tmpl-macro-emom"],
            },
            {
                "macroId": "tmpl-macro-tabata",
                "loopMode": "FIXED_MINUTES",
                "loopCycles": None,
                "loopMinutes": 16.0,
                "macro": MACRO_TEMPLATES["tmpl-macro-tabata"],
            },
            {
                "macroId": "tmpl-macro-emom",
                "loopMode": "FIXED_MINUTES",
                "loopCycles": None,
                "loopMinutes": 2.0,
                "macro": MACRO_TEMPLATES["tmpl-macro-emom"],
            },
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
    {
        "id": "tmpl-timer-emom30",
        "name": "EMOM 30min",
        "totalMinutes": 30,
        "slots": [
            {
                "macroId": "tmpl-macro-emom",
                "loopMode": "FIXED_CYCLES",
                "loopCycles": 30,
                "loopMinutes": None,
                "macro": MACRO_TEMPLATES["tmpl-macro-emom"],
            },
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
    {
        "id": "tmpl-timer-custom45",
        "name": "Custom 45min",
        "totalMinutes": 45,
        "slots": [
            {
                "macroId": "tmpl-macro-workrest",
                "loopMode": "FIXED_MINUTES",
                "loopCycles": None,
                "loopMinutes": 20.0,
                "macro": MACRO_TEMPLATES["tmpl-macro-workrest"],
            },
            {
                "macroId": "tmpl-macro-emom",
                "loopMode": "AUTO",
                "loopCycles": None,
                "loopMinutes": None,
                "macro": MACRO_TEMPLATES["tmpl-macro-emom"],
            },
            {
                "macroId": "tmpl-macro-workrest",
                "loopMode": "AUTO",
                "loopCycles": None,
                "loopMinutes": None,
                "macro": MACRO_TEMPLATES["tmpl-macro-workrest"],
            },
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
]
