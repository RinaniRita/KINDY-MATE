TIME_PROFILES = (
    "low_screen",
    "balanced",
    "learning_focused",
    "custom",
)


def age_band_for_age(age):
    return "3-5" if age <= 5 else "6-8"


def ceiling_for_age(age):
    if age_band_for_age(age) == "3-5":
        return {
            "session": 90,
            "total_screen": 60,
            "continuous": 15,
        }
    return {
        "session": 120,
        "total_screen": 90,
        "continuous": 20,
    }


def presets_for_age(age):
    if age_band_for_age(age) == "3-5":
        return {
            "low_screen": {
                "session": 45,
                "total_screen": 25,
                "continuous": 10,
                "break": 5,
            },
            "balanced": {
                "session": 60,
                "total_screen": 35,
                "continuous": 15,
                "break": 5,
            },
            "learning_focused": {
                "session": 60,
                "total_screen": 40,
                "continuous": 15,
                "break": 5,
            },
        }
    return {
        "low_screen": {
            "session": 60,
            "total_screen": 35,
            "continuous": 15,
            "break": 5,
        },
        "balanced": {
            "session": 90,
            "total_screen": 60,
            "continuous": 20,
            "break": 5,
        },
        "learning_focused": {
            "session": 90,
            "total_screen": 70,
            "continuous": 20,
            "break": 5,
        },
    }


def default_limits_for_age(age, profile="balanced"):
    presets = presets_for_age(age)
    values = presets.get(profile) or presets["balanced"]
    return {
        "time_profile": profile if profile in TIME_PROFILES else "balanced",
        "session_duration_limit_minutes": values["session"],
        "total_screen_time_limit_minutes": values["total_screen"],
        "continuous_screen_time_limit_minutes": values["continuous"],
        "minimum_offscreen_break_minutes": values["break"],
    }
