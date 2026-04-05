from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()


def to_monthly(amount: float, frequency: str) -> float:
    multipliers = {
        "weekly": 52 / 12,
        "biweekly": 26 / 12,
        "monthly": 1.0,
        "annual": 1 / 12,
        "once": 0.0,
    }
    return amount * multipliers.get(frequency, 1.0)


@router.get("/", response_model=List[schemas.IncomeOut])
def list_incomes(db: Session = Depends(get_db)):
    return db.query(models.Income).order_by(models.Income.id.desc()).all()


@router.post("/", response_model=schemas.IncomeOut)
def create_income(income: schemas.IncomeCreate, db: Session = Depends(get_db)):
    db_income = models.Income(**income.model_dump())
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income


@router.put("/{income_id}", response_model=schemas.IncomeOut)
def update_income(income_id: int, income: schemas.IncomeUpdate, db: Session = Depends(get_db)):
    db_income = db.query(models.Income).filter(models.Income.id == income_id).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    for field, value in income.model_dump(exclude_unset=True).items():
        setattr(db_income, field, value)
    db.commit()
    db.refresh(db_income)
    return db_income


@router.delete("/{income_id}")
def delete_income(income_id: int, db: Session = Depends(get_db)):
    db_income = db.query(models.Income).filter(models.Income.id == income_id).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    db.delete(db_income)
    db.commit()
    return {"ok": True}
