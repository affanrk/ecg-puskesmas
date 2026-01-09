import os
from pathlib import Path

def get_project_root() -> Path:
    """Mengembalikan path absolut ke root project"""
    # Asumsi file ini ada di app/utils/helpers.py, jadi root adalah naik 2 level
    return Path(__file__).parent.parent.parent

def resolve_path(relative_path: str) -> str:
    """Mengubah relative path menjadi absolute path yang aman"""
    root = get_project_root()
    # Gabungkan dan normalkan path (handle slash vs backslash otomatis)
    full_path = (root / relative_path).resolve()
    return str(full_path)

def format_duration(seconds: float) -> str:
    """Mengubah detik menjadi format MM:SS (untuk log durasi rekaman)"""
    m, s = divmod(seconds, 60)
    return f"{int(m):02d}:{int(s):02d}"