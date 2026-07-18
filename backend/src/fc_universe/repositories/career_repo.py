"""Career repository."""

from sqlalchemy.orm import Session
from fc_universe.models.career import Career


class CareerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, career_id: int) -> Career | None:
        return self.db.query(Career).filter(Career.id == career_id).first()

    def get_by_save_identifier(self, save_identifier: str) -> Career | None:
        return self.db.query(Career).filter(Career.save_identifier == save_identifier).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Career]:
        return self.db.query(Career).order_by(Career.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, career: Career) -> Career:
        self.db.add(career)
        self.db.commit()
        self.db.refresh(career)
        return career
