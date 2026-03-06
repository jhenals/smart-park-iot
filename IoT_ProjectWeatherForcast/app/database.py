import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
from dotenv import load_dotenv

load_dotenv()


def init_firebase():
    if len(firebase_admin._apps) > 0:
        print("(DATABASE) Firebase Admin SDK already initialized.")
        return
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)


def get_firebase_auth():
    """Get Firebase Auth instance"""
    init_firebase()
    return auth


def get_firestore_db():
    """Get Firestore instance"""
    init_firebase()
    return firestore.client()


def create_db():
    """Firebase initialization - collections are created on first write"""
    init_firebase()
