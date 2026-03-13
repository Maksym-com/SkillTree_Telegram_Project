from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict

from database import SessionLocal, engine, Base
from models import Skill, User

# Створення таблиць (якщо вони ще не створені)
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Залежність для отримання сесії БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Схеми ---

class SkillCreate(BaseModel):
    id: str
    name: str
    parent_id: str
    user_id: int
    world: str = "light"  # Можна передавати явно, або брати від батька

class RenameRequest(BaseModel):
    name: str

# --- Ендпоінти Користувача ---

@app.get("/")
def home():
    return {"status": "Skill Tree API with Abyss Logic is running", "docs": "/docs"}

@app.get("/user/init/{tg_id}")
def init_user(tg_id: int, username: Optional[str] = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == tg_id).first()
    
    if not user:
        user = User(telegram_id=tg_id, username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Створюємо два незалежних кореня для двох світів
        # Світло росте вгору (y=1750), Безодня вниз (y=250)
        roots = [
            {
                "id": f"root_light_{tg_id}",
                "name": "Core Light",
                "world": "light",
                "pos_x": 1000,
                "pos_y": 1750
            },
            {
                "id": f"root_abyss_{tg_id}",
                "name": "Void Core",
                "world": "abyss",
                "pos_x": 1000,
                "pos_y": 250
            }
        ]
        
        for r in roots:
            initial_skill = Skill(
                id=r["id"],
                name=r["name"],
                level=100.0,
                parent_id=None,
                world=r["world"],
                pos_x=r["pos_x"],
                pos_y=r["pos_y"],
                user_id=user.id
            )
            db.add(initial_skill)
        
        db.commit()
    
    return {"user_id": user.id, "tg_id": user.telegram_id, "username": user.username}

# --- Ендпоінти Навичок ---

@app.post("/skills/add")
def add_skill(skill_data: SkillCreate, db: Session = Depends(get_db)):
    # 1. Перевірка користувача
    user = db.query(User).filter(User.id == skill_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Перевірка на дублікат ID
    if db.query(Skill).filter(Skill.id == skill_data.id).first():
        raise HTTPException(status_code=400, detail="Skill ID already exists")

    # 3. Пошук батька
    parent = db.query(Skill).filter(
        Skill.id == skill_data.parent_id, 
        Skill.user_id == skill_data.user_id
    ).first()
    
    if not parent:
        raise HTTPException(status_code=404, detail="Parent skill not found")

    # 4. Розрахунок позиції (тільки для збереження в БД, фронтенд може ігнорувати)
    children_count = db.query(Skill).filter(Skill.parent_id == skill_data.parent_id).count()
    direction = 1 if children_count % 2 != 0 else -1
    offset = ((children_count + 1) // 2) * 150
    
    # В Abyss дерево росте вниз (+y), у Light вгору (-y)
    y_step = 150 if parent.world == "abyss" else -150

    new_skill = Skill(
        id=skill_data.id,
        name=skill_data.name,
        level=0.0,
        world=parent.world,  # Успадковуємо світ від батька
        parent_id=skill_data.parent_id,
        user_id=skill_data.user_id,
        pos_x=parent.pos_x + (direction * offset),
        pos_y=parent.pos_y + y_step
    )
    
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return {"status": "success", "skill": {"id": new_skill.id, "world": new_skill.world}}

@app.get("/skills/{user_id}")
def get_user_skills(user_id: int, db: Session = Depends(get_db)):
    skills = db.query(Skill).filter(Skill.user_id == user_id).all()
    
    # Повертаємо об'єкт, де ключі - це ID скілів (зручно для фронтенда)
    return {
        s.id: {
            "name": s.name,
            "level": s.level,
            "parent_id": s.parent_id,
            "world": s.world,
            "pos": {"x": s.pos_x, "y": s.pos_y}
        } for s in skills
    }

@app.post("/train/{skill_id}")
def train_skill(skill_id: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    if skill.level >= 100:
        return {"status": "maxed", "level": 100.0}

    # Додаємо 5% досвіду
    skill.level = min(100.0, skill.level + 5.0) 
    db.commit()
    return {"status": "success", "level": skill.level}

@app.put("/skills/{skill_id}/rename")
def rename_skill(skill_id: str, request: RenameRequest, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    skill.name = request.name
    db.commit()
    return {"status": "success", "new_name": skill.name}

@app.delete("/skills/{skill_id}")
def delete_skill(skill_id: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    # Заборона видалення коренів обох світів
    if "root_" in skill.id:
         raise HTTPException(status_code=403, detail="Cannot delete a Core node")

    # Рекурсивне видалення дітей (SQLAlchemy cascade зробить це сам, але тут для певності)
    db.delete(skill)
    db.commit()
    return {"status": "deleted", "id": skill_id}

@app.delete("/user/{user_id}/reset")
def reset_user_tree(user_id: int, db: Session = Depends(get_db)):
    # Видаляємо всі скіли крім кореневих
    db.query(Skill).filter(
        Skill.user_id == user_id, 
        ~Skill.id.contains("root_")
    ).delete(synchronize_session=False)
    
    # Скидаємо корені до 100%
    roots = db.query(Skill).filter(Skill.user_id == user_id, Skill.id.contains("root_")).all()
    for r in roots:
        r.level = 100.0
        
    db.commit()
    return {"status": "reset_complete"}