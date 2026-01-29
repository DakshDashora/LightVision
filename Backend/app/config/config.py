import os
from dotenv import load_dotenv

load_dotenv()



GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

GOOGLE_APPLICATION_CREDENTIALS=os.getenv("GOOGLE_APPLICATION_CREDENTIALS")


# ===== Validation =====
if not GOOGLE_API_KEY:
    raise RuntimeError("❌ GOOGLE_API_KEY not found in .env")


