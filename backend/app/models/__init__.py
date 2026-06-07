"""
ORM model package — import all models here so Alembic can discover them.
"""

from app.models.company import Company  # noqa: F401
from app.models.stock_price import StockPrice  # noqa: F401
from app.models.financials import Financial  # noqa: F401
from app.models.ownership import Ownership  # noqa: F401
from app.models.news import News  # noqa: F401
from app.models.relationships import CompanyRelationship  # noqa: F401
from app.models.forex_rate import ForexRate  # noqa: F401
# ── Notification system ───────────────────────────────────────────────────────
from app.models.user_notification import UserNotification  # noqa: F401
from app.models.research_item import ResearchItem  # noqa: F401
from app.models.ai_research_report import AIResearchReport  # noqa: F401
from app.models.notification_log import NotificationEntry  # noqa: F401
# ── Virtual Trading ───────────────────────────────────────────────────────────
from app.models.virtual_account import VirtualAccount  # noqa: F401
from app.models.virtual_holding import VirtualHolding  # noqa: F401
from app.models.virtual_transaction import VirtualTransaction  # noqa: F401
from app.models.monthly_leaderboard import MonthlyLeaderboard  # noqa: F401
