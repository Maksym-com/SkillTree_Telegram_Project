from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import SessionLocal, engine, Base
from models import Skill, User

# Створення таблиць
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Ендпоінти Користувача ---

@app.get("/user/init/{tg_id}")
def init_user(tg_id: int, username: Optional[str] = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == tg_id).first()
    if not user:
        user = User(telegram_id=tg_id, username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Створюємо персональний Root
        root_id = f"root_{tg_id}"
        initial_skill = Skill(
            id=root_id,
            name="My Core",
            level=100.0, # Корінь зазвичай прокачаний
            parent_id=None,
            pos_x=400,
            pos_y=50,
            user_id=user.id
        )
        db.add(initial_skill)
        db.commit()
    
    return {"user_id": user.id, "tg_id": user.telegram_id}

# --- Ендпоінти Навичок ---

class SkillCreate(BaseModel):
    id: str
    name: str
    parent_id: str
    user_id: int # Обов'язково для прив'язки

@app.post("/skills/add")
def add_skill(skill_data: SkillCreate, db: Session = Depends(get_db)):
    # 1. Перевірка користувача
    user = db.query(User).filter(User.id == skill_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Перевірка на дублікат ID
    existing = db.query(Skill).filter(Skill.id == skill_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists")

    # 3. Пошук батька (тільки серед скілів цього юзера)
    parent = db.query(Skill).filter(
        Skill.id == skill_data.parent_id, 
        Skill.user_id == skill_data.user_id
    ).first()
    
    if not parent:
        new_x, new_y = 400, 150
    else:
        # Рахуємо дітей тільки цього батька
        children_count = db.query(Skill).filter(Skill.parent_id == skill_data.parent_id).count()
        
        horizontal_step = 140
        vertical_step = 120
        offset_multiplier = (children_count + 1) // 2
        direction = 1 if children_count % 2 != 0 else -1
        
        new_x = parent.pos_x if children_count == 0 else parent.pos_x + (direction * offset_multiplier * horizontal_step)
        new_y = parent.pos_y + vertical_step

    new_skill = Skill(
        id=skill_data.id,
        name=skill_data.name,
        level=0.0,
        pos_x=new_x,
        pos_y=new_y,
        parent_id=skill_data.parent_id if parent else None,
        user_id=skill_data.user_id
    )
    
    db.add(new_skill)
    db.commit()
    return {"status": "success", "id": new_skill.id}

@app.get("/skills/{user_id}")
def get_user_skills(user_id: int, db: Session = Depends(get_db)):
    skills = db.query(Skill).filter(Skill.user_id == user_id).all()
    if not skills:
        return {} # Повертаємо порожній об'єкт, якщо юзер новий
    return {
        s.id: {
            "name": s.name,
            "level": s.level,
            "parent": s.parent_id,
            "pos": {"x": s.pos_x, "y": s.pos_y}
        } for s in skills
    }

@app.delete("/skills/{skill_id}")
def delete_skill(skill_id: str, db: Session = Depends(get_db)):
    target_skill = db.query(Skill).filter(Skill.id == skill_id).first()
    
    if not target_skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    # Захист будь-якого кореневого вузла
    if target_skill.id.startswith("root_"):
         raise HTTPException(status_code=403, detail="Cannot delete your Core node")

    # Видалення дітей
    db.query(Skill).filter(Skill.parent_id == skill_id).delete(synchronize_session=False)
    db.delete(target_skill)
    db.commit()
    
    return {"status": "deleted", "id": skill_id}

@app.post("/train/{skill_id}")
def train(skill_id: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    skill.level = min(100, skill.level + 10)
    db.commit()
    db.refresh(skill)
    return {"id": skill.id, "level": skill.level}