"""Clerk JWT verification for FastAPI bearer tokens."""

import logging
import os
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_clerk_options() -> dict:
    public_key = os.getenv("CLERK_JWT_KEY")
    if not public_key:
        raise RuntimeError("Set CLERK_JWT_KEY in backend/.env.")
    options = {"algorithms": ["RS256"], "key": public_key}
    issuer = os.getenv("CLERK_ISSUER")
    audience = os.getenv("CLERK_AUDIENCE")
    if issuer:
        options["issuer"] = issuer
    if audience:
        options["audience"] = audience
    return options


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> str:
    if credentials is not None:
        try:
            claims = jwt.decode(credentials.credentials, **get_clerk_options())
            subject = claims.get("sub")
            if subject:
                return subject
        except (jwt.InvalidTokenError, RuntimeError) as error:
            logger.warning("Clerk token verification failed (%s)", type(error).__name__)
    raise HTTPException(
        status_code=401,
        detail="Invalid or expired authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
