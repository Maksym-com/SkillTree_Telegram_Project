from sqlalchemy import Column, Integer, String, Float, ForeignKey
from database import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    level = Column(Float, default=0.0)
    pos_x = Column(Integer)
    pos_y = Column(Integer)
    parent_id = Column(String, ForeignKey("skills.id"), nullable=True)