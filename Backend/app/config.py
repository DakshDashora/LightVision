# app/config.py

import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR=Path(__file__).resolve().parent.parent
print(BASE_DIR)
load_dotenv(BASE_DIR/".env")

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
AGENT_ENGINE_NAME = os.getenv("AGENT_ENGINE_NAME")

if not PROJECT_ID:
    raise RuntimeError("GOOGLE_CLOUD_PROJECT not set")

if not LOCATION:
    raise RuntimeError("GOOGLE_CLOUD_LOCATION not set")

if not AGENT_ENGINE_NAME:
    raise RuntimeError("AGENT_ENGINE_NAME not set")
