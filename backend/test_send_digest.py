import asyncio
import logging
from app.services.notification_dispatcher import dispatch_daily_digest_to_all

# Configure logs to print to console
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")

async def test_send():
    print("[Test] Triggering Daily Research Digest delivery immediately for testing...")
    count = await dispatch_daily_digest_to_all()
    print(f"[Test] Finished! Daily digest dispatched to {count} users.")

if __name__ == "__main__":
    asyncio.run(test_send())
