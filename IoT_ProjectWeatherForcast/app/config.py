import os
from dotenv import load_dotenv

load_dotenv()

# INFLUXDB Configuration
INFLUXDB_URL = os.getenv("INFLUXDB_URL", "")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "")
INFLUXDB_MEASUREMENT = os.getenv("INFLUXDB_MEASUREMENT", "")

# GROQ API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Firebase Configuration
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "iot-project-49099")
FIREBASE_PRIVATE_KEY_ID = os.getenv("FIREBASE_PRIVATE_KEY_ID", "")
FIREBASE_PRIVATE_KEY = os.getenv("FIREBASE_PRIVATE_KEY", "")
FIREBASE_CLIENT_EMAIL = os.getenv(
    "FIREBASE_CLIENT_EMAIL", "firebase-adminsdk@iot-project-49099.iam.gserviceaccount.com")
FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID", "")
FIREBASE_CERT_URL = os.getenv("FIREBASE_CERT_URL", "")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")


def validate_config() -> None:
    missing = [k for k, v in {
        "INFLUXDB_URL": INFLUXDB_URL,
        "INFLUXDB_TOKEN": INFLUXDB_TOKEN,
        "INFLUXDB_ORG": INFLUXDB_ORG,
        "INFLUXDB_BUCKET": INFLUXDB_BUCKET,
        "INFLUXDB_MEASUREMENT": INFLUXDB_MEASUREMENT,

        "GROQ_API_KEY": GROQ_API_KEY,

        "FIREBASE_PROJECT_ID": FIREBASE_PROJECT_ID,
        "FIREBASE_PRIVATE_KEY_ID": FIREBASE_PRIVATE_KEY_ID,
        "FIREBASE_PRIVATE_KEY": FIREBASE_PRIVATE_KEY,
        "FIREBASE_CLIENT_EMAIL": FIREBASE_CLIENT_EMAIL,
        "FIREBASE_CLIENT_ID": FIREBASE_CLIENT_ID,
        "FIREBASE_CERT_URL": FIREBASE_CERT_URL,
        "FIREBASE_CREDENTIALS_PATH": FIREBASE_CREDENTIALS_PATH,
    }.items() if not v]
    if missing:
        raise RuntimeError(
            f"Missing environment variables: {', '.join(missing)}")
