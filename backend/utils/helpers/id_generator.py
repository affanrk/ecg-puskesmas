from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from utils.logger import logger
from core.exceptions import AppException


def generate_custom_id(
    prefix: str, table_name: str, db: Session, id_column: str = "id"
) -> str:
    logger.debug(
        f"Entering generate_custom_id, prefix={prefix}, table_name={table_name}, id_column={id_column}"
    )
    try:
        today_str = datetime.now().strftime("%Y%m%d")
        seq_key = f"{prefix}_{today_str}"

        result = db.execute(
            text("SELECT last_seq FROM tb_m_sequence WHERE id = :key"), {"key": seq_key}
        ).fetchone()

        if result is not None:
            new_seq = result[0] + 1
            db.execute(
                text("UPDATE tb_m_sequence SET last_seq = :seq WHERE id = :key"),
                {"seq": new_seq, "key": seq_key},
            )
        else:
            pattern = f"{prefix}{today_str}%"
            query = text(
                f"SELECT {id_column} FROM {table_name} WHERE {id_column} LIKE :pattern ORDER BY {id_column} DESC LIMIT 1"
            )
            old_result = db.execute(query, {"pattern": pattern}).fetchone()

            if old_result and old_result[0]:
                last_id = old_result[0]
                new_seq = int(last_id[-6:]) + 1
            else:
                new_seq = 1

            db.execute(
                text("INSERT INTO tb_m_sequence (id, last_seq) VALUES (:key, :seq)"),
                {"key": seq_key, "seq": new_seq},
            )

        custom_id = f"{prefix}{today_str}{new_seq:06d}"
        logger.debug(f"Exiting generate_custom_id, custom_id={custom_id}")
        return custom_id
    except Exception as e:
        logger.error(f"Error in generate_custom_id: {str(e)}")
        raise AppException(message=f"Failed to generate custom ID: {str(e)}")
