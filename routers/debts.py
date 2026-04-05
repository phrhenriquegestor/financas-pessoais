from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.FixedDebtOut])
def list_debts(db: Session = Depends(get_db)):
    return db.query(models.FixedDebt).order_by(models.FixedDebt.due_day).all()


@router.post("/", response_model=schemas.FixedDebtOut)
def create_debt(debt: schemas.FixedDebtCreate, db: Session = Depends(get_db)):
    db_debt = models.FixedDebt(**debt.model_dump())
    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)
    return db_debt


@router.put("/{debt_id}", response_model=schemas.FixedDebtOut)
def update_debt(debt_id: int, debt: schemas.FixedDebtUpdate, db: Session = Depends(get_db)):
    db_debt = db.query(models.FixedDebt).filter(models.FixedDebt.id == debt_id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    for field, value in debt.model_dump(exclude_unset=True).items():
        setattr(db_debt, field, value)
    db.commit()
    db.refresh(db_debt)
    return db_debt


@router.delete("/{debt_id}")
def delete_debt(debt_id: int, db: Session = Depends(get_db)):
    db_debt = db.query(models.FixedDebt).filter(models.FixedDebt.id == debt_id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    db.delete(db_debt)
    db.commit()
    return {"ok": True}
