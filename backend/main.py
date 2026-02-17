from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Разрешаем фронтенду обращаться к бэкенду

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Твое будущее дерево
skills_db = {
    "root": {"id": "root", "name": "Выживание", "level": 1, "children": ["py", "gym"]},
    "py": {"id": "py", "name": "Python", "level": 1, "children": []},
    "gym": {"id": "gym", "name": "Сила", "level": 1, "children": []}
}

@app.get("/api/skills")
async def get_skills():
    return skills_db

@app.post("/api/upgrade/{skill_id}")
async def upgrade(skill_id: str):
    if skill_id in skills_db:
        skills_db[skill_id]["level"] += 1
    return skills_db[skill_id]
