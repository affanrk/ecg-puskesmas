from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text


def generate_custom_id(
    prefix: str, table_name: str, db: Session, id_column: str = "id"
) -> str:
    """
    Generates a custom ID in the format [Prefix]YYYYMMDD[6-digit Sequence]
    Example: USR20260213000001
    """
    today_str = datetime.now().strftime("%Y%m%d")
    pattern = f"{prefix}{today_str}%"

    # Query the database for the highest sequence number for today
    query = text(
        f"SELECT {id_column} FROM {table_name} WHERE {id_column} LIKE :pattern ORDER BY {id_column} DESC LIMIT 1"
    )
    result = db.execute(query, {"pattern": pattern}).fetchone()

    if result and result[0]:
        last_id = result[0]
        # Extract the sequence part (last 6 digits)
        last_seq = int(last_id[-6:])
        new_seq = last_seq + 1
    else:
        new_seq = 1

    return f"{prefix}{today_str}{new_seq:06d}"
