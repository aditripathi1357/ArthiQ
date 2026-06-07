import asyncio
from sqlalchemy import text
from app.database import async_session_factory

async def test():
    async with async_session_factory() as session:
        try:
            # Query column names of users table
            res = await session.execute(text("SELECT column_name Cullen FROM information_schema.columns WHERE table_name = 'users';"))
            columns = [row[0] for row in res.all()]
            print("Columns in 'users' table:", columns)
        except Exception as e:
            print("Error:", e)

asyncio.run(test())
