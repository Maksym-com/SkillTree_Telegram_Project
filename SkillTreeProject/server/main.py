from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Імпортуємо налаштування бази та моделі з твоїх нових файлів
from database import SessionLocal, engine, Base
from models import Skill
from models import User

# Створюємо таблиці в базі даних (якщо вони ще не створені)
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Налаштування CORS (залишаємо як було)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Функція для отримання доступу до бази даних (Dependency Injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Функція для початкового заповнення бази (Seed), щоб дерево не було пустим
def seed_db(db: Session):
    if db.query(Skill).first() is None:
        initial_skills = [
            Skill(id="root", name="Core", level=100, parent_id=None, pos_x=400, pos_y=50),
            Skill(id="python", name="Python", level=80, parent_id="root", pos_x=200, pos_y=200),
            Skill(id="js", name="JavaScript", level=60, parent_id="root", pos_x=600, pos_y=200),
            Skill(id="fastapi", name="FastAPI", level=30, parent_id="python", pos_x=100, pos_y=350),
            Skill(id="react", name="React", level=45, parent_id="js", pos_x=700, pos_y=350),
            Skill(id="django", name="Django", level=10, parent_id="python", pos_x=300, pos_y=350),
            Skill(id="sql", name="SQL", level=20, parent_id="root", pos_x=400, pos_y=350),
        ]
        db.add_all(initial_skills)
        db.commit()

# Викликаємо заповнення при старті додатка
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()

@app.get("/skills")
def get_skills(db: Session = Depends(get_db)):
    # Отримуємо всі навички з БД
    skills = db.query(Skill).all()
    
    # Форматуємо дані назад у словник, який очікує твій React-фронтенд
    return {
        s.id: {
            "name": s.name,
            "level": s.level,
            "parent": s.parent_id,
            "pos": {"x": s.pos_x, "y": s.pos_y}
        } for s in skills
    }

@app.post("/train/{skill_id}")
def train(skill_id: str, db: Session = Depends(get_db)):
    # Шукаємо навичку в реальній базі
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    # Оновлюємо рівень
    skill.level = min(100, skill.level + 10)
    
    db.commit()  # Зберігаємо зміни
    db.refresh(skill)  # Отримуємо оновлені дані з бази
    
    return {
        "id": skill.id, 
        "name": skill.name, 
        "level": skill.level
    }