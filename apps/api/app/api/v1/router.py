from fastapi import APIRouter

from app.api.v1.routes import balances, dashboard, events, expenses, health, memories, receipts

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(events.router)
api_router.include_router(receipts.router)
api_router.include_router(expenses.router)
api_router.include_router(balances.router)
api_router.include_router(memories.router)
api_router.include_router(dashboard.router)
