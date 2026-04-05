from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()


# ── Cards ────────────────────────────────────────────────────────────────────

@router.get("/cards", response_model=List[schemas.CreditCardOut])
def list_cards(db: Session = Depends(get_db)):
    return db.query(models.CreditCard).order_by(models.CreditCard.id).all()


@router.post("/cards", response_model=schemas.CreditCardOut)
def create_card(card: schemas.CreditCardCreate, db: Session = Depends(get_db)):
    db_card = models.CreditCard(**card.model_dump())
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


@router.put("/cards/{card_id}", response_model=schemas.CreditCardOut)
def update_card(card_id: int, card: schemas.CreditCardUpdate, db: Session = Depends(get_db)):
    db_card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    for field, value in card.model_dump(exclude_unset=True).items():
        setattr(db_card, field, value)
    db.commit()
    db.refresh(db_card)
    return db_card


@router.delete("/cards/{card_id}")
def delete_card(card_id: int, db: Session = Depends(get_db)):
    db_card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    db.delete(db_card)
    db.commit()
    return {"ok": True}


# ── Purchases ────────────────────────────────────────────────────────────────

@router.get("/purchases", response_model=List[schemas.CreditPurchaseOut])
def list_purchases(card_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.CreditPurchase)
    if card_id:
        query = query.filter(models.CreditPurchase.card_id == card_id)
    return query.order_by(models.CreditPurchase.purchase_date.desc()).all()


@router.post("/purchases", response_model=schemas.CreditPurchaseOut)
def create_purchase(purchase: schemas.CreditPurchaseCreate, db: Session = Depends(get_db)):
    card = db.query(models.CreditCard).filter(models.CreditCard.id == purchase.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")

    data = purchase.model_dump()
    data["monthly_amount"] = round(purchase.amount / max(purchase.installments, 1), 2)
    db_purchase = models.CreditPurchase(**data)
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)
    return db_purchase


@router.put("/purchases/{purchase_id}", response_model=schemas.CreditPurchaseOut)
def update_purchase(purchase_id: int, purchase: schemas.CreditPurchaseUpdate, db: Session = Depends(get_db)):
    db_purchase = db.query(models.CreditPurchase).filter(models.CreditPurchase.id == purchase_id).first()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    for field, value in purchase.model_dump(exclude_unset=True).items():
        setattr(db_purchase, field, value)
    db.commit()
    db.refresh(db_purchase)
    return db_purchase


@router.delete("/purchases/{purchase_id}")
def delete_purchase(purchase_id: int, db: Session = Depends(get_db)):
    db_purchase = db.query(models.CreditPurchase).filter(models.CreditPurchase.id == purchase_id).first()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    db.delete(db_purchase)
    db.commit()
    return {"ok": True}
