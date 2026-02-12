import re
from pathlib import Path
from datetime import datetime, date


def get_project_root() -> Path:

    return Path(__file__).parent.parent.parent


def resolve_path(relative_path: str) -> str:

    root = get_project_root()
    return str((root / relative_path).resolve())


def format_duration(seconds: float) -> str:

    m, s = divmod(seconds, 60)
    return f"{int(m):02d}:{int(s):02d}"


def calculate_age(dob: date) -> int:

    today = datetime.now().date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def sanitize_filename(filename: str) -> str:

    return re.sub(r"(?u)[^-\w.]", "_", filename)
