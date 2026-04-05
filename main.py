from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from database import engine
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finanças Pessoais", docs_url="/docs")

app.mount("/static", StaticFiles(directory="static"), name="static")

from routers import income, debts, credit, investments, goals, dashboard

app.include_router(income.router, prefix="/api/income", tags=["Receitas"])
app.include_router(debts.router, prefix="/api/debts", tags=["Dívidas"])
app.include_router(credit.router, prefix="/api/credit", tags=["Cartões"])
app.include_router(investments.router, prefix="/api/investments", tags=["Investimentos"])
app.include_router(goals.router, prefix="/api/goals", tags=["Metas"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/")
async def root():
    return FileResponse("templates/index.html")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
