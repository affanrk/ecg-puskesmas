import re
from pathlib import Path
from datetime import datetime, date
from utils.logger import logger
from core.exceptions import AppException


def get_project_root() -> Path:
    logger.debug("Entering get_project_root")
    try:
        root = Path(__file__).parent.parent.parent
        logger.debug(f"Exiting get_project_root, root={root}")
        return root
    except Exception as e:
        logger.error(f"Error in get_project_root: {str(e)}")
        raise AppException(message=f"Failed to get project root: {str(e)}")


def resolve_path(relative_path: str) -> str:
    logger.debug(f"Entering resolve_path, relative_path={relative_path}")
    try:
        root = get_project_root()
        resolved = str((root / relative_path).resolve())
        logger.debug(f"Exiting resolve_path, resolved={resolved}")
        return resolved
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error in resolve_path: {str(e)}")
        raise AppException(message=f"Failed to resolve path: {str(e)}")


def format_duration(seconds: float) -> str:
    logger.debug(f"Entering format_duration, seconds={seconds}")
    try:
        m, s = divmod(seconds, 60)
        formatted = f"{int(m):02d}:{int(s):02d}"
        logger.debug(f"Exiting format_duration, formatted={formatted}")
        return formatted
    except Exception as e:
        logger.error(f"Error in format_duration: {str(e)}")
        raise AppException(message=f"Failed to format duration: {str(e)}")


def calculate_age(dob: date) -> int:
    logger.debug(f"Entering calculate_age, dob={dob}")
    try:
        today = datetime.now().date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        logger.debug(f"Exiting calculate_age, age={age}")
        return age
    except Exception as e:
        logger.error(f"Error in calculate_age: {str(e)}")
        raise AppException(message=f"Failed to calculate age: {str(e)}")


def sanitize_filename(filename: str) -> str:
    logger.debug(f"Entering sanitize_filename, filename={filename}")
    try:
        sanitized = re.sub(r"(?u)[^-\w.]", "_", filename)
        logger.debug(f"Exiting sanitize_filename, sanitized={sanitized}")
        return sanitized
    except Exception as e:
        logger.error(f"Error in sanitize_filename: {str(e)}")
        raise AppException(message=f"Failed to sanitize filename: {str(e)}")
