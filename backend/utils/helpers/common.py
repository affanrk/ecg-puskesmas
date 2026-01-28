"""
Helper utilities for the backend application.
Includes path resolution, formatting, and mathematical helpers.
"""

import re
from pathlib import Path
from datetime import datetime, date


def get_project_root() -> Path:
    """
    Retrieve the absolute path to the project root directory.
    """
    return Path(__file__).parent.parent.parent


def resolve_path(relative_path: str) -> str:
    """
    Convert a relative project path into a safe absolute path.

    Args:
        relative_path: Path relative to project root

    Returns:
        Absolute path string
    """
    root = get_project_root()
    return str((root / relative_path).resolve())


def format_duration(seconds: float) -> str:
    """
    Format a duration in seconds into MM:SS string.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted string (e.g., "02:30")
    """
    m, s = divmod(seconds, 60)
    return f"{int(m):02d}:{int(s):02d}"


def calculate_age(dob: date) -> int:
    """
    Calculate current age based on date of birth.

    Args:
        dob: Date of birth

    Returns:
        Age in years
    """
    today = datetime.now().date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def sanitize_filename(filename: str) -> str:
    """
    Remove potentially dangerous characters from a filename.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    return re.sub(r"(?u)[^-\w.]", "_", filename)
