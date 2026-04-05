from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    frequency = Column(String, default="monthly")  # weekly/biweekly/monthly/annual/once
    start_date = Column(Date, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class FixedDebt(Base):
    __tablename__ = "fixed_debts"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    due_day = Column(Integer, default=1)  # day of month 1-31
    category = Column(String, default="other")  # housing/utilities/insurance/subscription/loan/other
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class CreditCard(Base):
    __tablename__ = "credit_cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    limit = Column(Float, nullable=False)
    closing_day = Column(Integer, default=15)
    due_day = Column(Integer, default=22)
    color = Column(String, default="#4f8ef7")
    created_at = Column(DateTime, server_default=func.now())

    purchases = relationship("CreditPurchase", back_populates="card", cascade="all, delete-orphan")


class CreditPurchase(Base):
    __tablename__ = "credit_purchases"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=False)
    label = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    installments = Column(Integer, default=1)
    installments_paid = Column(Integer, default=0)
    monthly_amount = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=False)
    category = Column(String, default="other")  # shopping/food/travel/health/other
    created_at = Column(DateTime, server_default=func.now())

    card = relationship("CreditCard", back_populates="purchases")


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    type = Column(String, default="fixed")  # fixed/variable/crypto/real_estate
    principal = Column(Float, nullable=False)
    monthly_contribution = Column(Float, default=0.0)
    annual_rate = Column(Float, nullable=False)
    start_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_savings = Column(Float, default=0.0)
    monthly_savings = Column(Float, nullable=False)
    priority = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
