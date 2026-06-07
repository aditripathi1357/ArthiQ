# 🧠 SmartFin — Intelligent Financial Analytics Platform

> A next-generation alternative to Investing.com — it doesn't just show data, **it explains it**.

SmartFin combines live market data, AI-powered insights, and rich company intelligence into a single platform for Indian (NSE/BSE) and global equities.

---

## ✨ Features

| Feature | Status |
|---|---|
| Live stock prices (NSE/BSE + Global) | 🔲 Planned |
| Forex exchange rates | 🔲 Planned |
| Company profiles (CEO, founders, financials) | 🔲 Planned |
| Ownership breakdown (Promoter / FII / DII / Retail) | 🔲 Planned |
| AI "Why did this stock move?" explanations | 🔲 Planned |
| Company relationship graph | 🔲 Planned |
| News with sentiment analysis | 🔲 Planned |

---

## 🏗️ Architecture

```
smartfin/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Pydantic Settings
│   │   ├── database.py          # Async SQLAlchemy + asyncpg
│   │   ├── models/              # ORM models (6 tables)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers
│   │   ├── services/            # Business logic & external API integrations
│   │   └── utils/               # Shared helpers
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/                    # (placeholder — TBD)
├── docker-compose.yml           # Backend + PostgreSQL + pgAdmin
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 + TimescaleDB |
| ORM | SQLAlchemy 2.0 (async) + Alembic |
| Data Sources | yfinance, Alpha Vantage, NewsAPI, ExchangeRate-API |
| AI | OpenAI API (GPT-4o-mini) |
| Scheduler | APScheduler |
| Containerization | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (recommended)
- Or: Python 3.12+, PostgreSQL 16 with TimescaleDB extension

---

### Option A — Docker (recommended)

```bash
# 1. Clone and enter the project
cd smartfin

# 2. Create your .env file
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# 3. Start all services
docker compose up --build

# 4. Access the services
#    API Docs:  http://localhost:8000/docs
#    pgAdmin:   http://localhost:5050
#    Health:    http://localhost:8000/health
```

---

### Option B — Local Development

```bash
# 1. Create and activate a virtual environment
cd smartfin/backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and API keys

# 4. Run database migrations
alembic upgrade head

# 5. Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 6. Open the interactive API docs
#    http://localhost:8000/docs
```

---

## 🗄️ Database Schema

The platform uses 6 core tables:

| Table | Purpose |
|---|---|
| `companies` | Company profiles (symbol, sector, CEO, HQ, etc.) |
| `stock_prices` | OHLCV time-series data (TimescaleDB hypertable) |
| `financials` | Quarterly & annual financials (revenue, P/E, ROE, etc.) |
| `ownership` | Shareholding pattern (Promoter / FII / DII / Retail %) |
| `news` | News articles with AI sentiment scores |
| `company_relationships` | Parent ↔ child / competitor / investor links |

### Creating Migrations

```bash
cd backend

# Auto-generate a migration from model changes
alembic revision --autogenerate -m "description of change"

# Apply migrations
alembic upgrade head
```

> **Note:** After initial setup, you'll need to manually enable the TimescaleDB
> extension and convert `stock_prices` to a hypertable:
> ```sql
> CREATE EXTENSION IF NOT EXISTS timescaledb;
> SELECT create_hypertable('stock_prices', 'timestamp');
> ```

---

## 🔑 API Keys Required

| Service | Env Variable | Free Tier |
|---|---|---|
| [OpenAI](https://platform.openai.com/) | `OPENAI_API_KEY` | Pay-as-you-go |
| [Alpha Vantage](https://www.alphavantage.co/) | `ALPHA_VANTAGE_API_KEY` | ✅ 25 req/day |
| [NewsAPI](https://newsapi.org/) | `NEWS_API_KEY` | ✅ 100 req/day |
| [ExchangeRate-API](https://www.exchangerate-api.com/) | `EXCHANGE_RATE_API_KEY` | ✅ 1500 req/mo |

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/companies/` | List companies (filterable) |
| `POST` | `/api/v1/companies/` | Add a new company |
| `GET` | `/api/v1/companies/{id}` | Get company details |
| `PATCH` | `/api/v1/companies/{id}` | Update company |
| `DELETE` | `/api/v1/companies/{id}` | Delete company |
| `GET` | `/api/v1/stocks/{id}/prices` | Get historical prices |
| `GET` | `/api/v1/stocks/latest/{id}` | Get latest price |
| `GET` | `/api/v1/forex/rate` | Single forex rate |
| `GET` | `/api/v1/forex/rates` | Multiple forex rates |
| `GET` | `/api/v1/news/` | List news (filterable) |
| `POST` | `/api/v1/insights/explain` | AI price-move explanation |

---

## 📄 License

Private project — all rights reserved.
