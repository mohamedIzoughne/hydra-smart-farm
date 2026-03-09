import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost:3306/smartagri",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Accept comma-separated origins from the env var, e.g.:
    #   CORS_ORIGINS=http://localhost:8080,https://mydomain.com
    _raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:8080")
    CORS_ORIGINS = (
        [o.strip() for o in _raw_origins.split(",")]
        if _raw_origins != "*"
        else "*"
    )
    # Required to pass Authorization headers / cookies cross-origin
    CORS_SUPPORTS_CREDENTIALS = True

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "jwt-change-me"))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
