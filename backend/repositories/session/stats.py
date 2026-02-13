from sqlalchemy.orm import Session
from sqlalchemy import func
from models.session import TbREcgSession
from schemas.session import ClassificationStatsResponse
from core.exceptions import DatabaseException
from typing import Optional


class SessionStatsProcessor:
    def __init__(self, db: Session):
        self.db = db

    def get_classification_stats(
        self, user_id: Optional[str] = None
    ) -> ClassificationStatsResponse:
        try:
            query = self.db.query(TbREcgSession)
            if user_id:
                query = query.filter(TbREcgSession.user_id == user_id)

            total_sessions = query.count()

            classification_counts = (
                query.group_by(TbREcgSession.classification_result)
                .with_entities(
                    TbREcgSession.classification_result,
                    func.count(TbREcgSession.classification_result),
                )
                .all()
            )

            counts_list = [
                {"classification": c, "count": cnt} for c, cnt in classification_counts
            ]

            return ClassificationStatsResponse(
                total_sessions=total_sessions, classification_counts=counts_list
            )
        except Exception as e:
            raise DatabaseException(
                "Failed to retrieve classification statistics",
                details={"error": str(e)},
            )
