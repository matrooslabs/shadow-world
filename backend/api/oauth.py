from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from config import get_settings
from db import get_db
from models import Substrate, SocialAccount
import httpx
import secrets
from urllib.parse import urlencode
from datetime import datetime, timedelta

router = APIRouter(prefix="/oauth", tags=["oauth"])

# In-memory state store (use Redis in production)
oauth_states: dict[str, dict] = {}


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str


@router.get("/twitter/authorize")
async def twitter_authorize(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get Twitter OAuth 2.0 authorization URL."""
    settings = get_settings()

    # Verify substrate exists
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()

    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    # Generate state token
    nonce = secrets.token_urlsafe(16)
    state = f"twitter:{substrate_id}:{nonce}"

    # Store state for verification
    oauth_states[state] = {
        "substrate_id": substrate_id,
        "created_at": datetime.utcnow(),
    }

    # Clean up old states (older than 10 minutes)
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    oauth_states_to_remove = [
        k for k, v in oauth_states.items() if v["created_at"] < cutoff
    ]
    for k in oauth_states_to_remove:
        del oauth_states[k]

    # Build authorization URL
    # Twitter OAuth 2.0 with PKCE
    params = {
        "response_type": "code",
        "client_id": settings.twitter_client_id,
        "redirect_uri": settings.twitter_redirect_uri,
        "scope": "tweet.read users.read offline.access",
        "state": state,
        "code_challenge": nonce,  # Simplified - use proper PKCE in production
        "code_challenge_method": "plain",
    }

    auth_url = f"https://twitter.com/i/oauth2/authorize?{urlencode(params)}"

    return {"url": auth_url}


@router.post("/twitter/callback")
async def twitter_callback(
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Handle Twitter OAuth callback."""
    settings = get_settings()

    # Verify state
    if request.state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    state_data = oauth_states.pop(request.state)
    substrate_id = state_data["substrate_id"]

    # Parse state to get nonce for PKCE
    state_parts = request.state.split(":")
    if len(state_parts) < 3:
        raise HTTPException(status_code=400, detail="Invalid state format")
    nonce = state_parts[2]

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://api.twitter.com/2/oauth2/token",
            data={
                "grant_type": "authorization_code",
                "code": request.code,
                "redirect_uri": settings.twitter_redirect_uri,
                "code_verifier": nonce,
                "client_id": settings.twitter_client_id,
            },
            auth=(settings.twitter_client_id, settings.twitter_client_secret),
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code: {token_response.text}",
            )

        tokens = token_response.json()

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 7200)

    # Get user info
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.twitter.com/2/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"user.fields": "id,username,name,profile_image_url"},
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        user_data = user_response.json().get("data", {})

    # Check if account already exists
    result = await db.execute(
        select(SocialAccount).where(
            SocialAccount.substrate_id == substrate_id,
            SocialAccount.platform == "twitter",
        )
    )
    existing_account = result.scalar_one_or_none()

    if existing_account:
        # Update existing account
        existing_account.platform_user_id = user_data.get("id")
        existing_account.username = user_data.get("username")
        existing_account.set_access_token(access_token)
        if refresh_token:
            existing_account.set_refresh_token(refresh_token)
        existing_account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        account = existing_account
    else:
        # Create new account
        account = SocialAccount(
            substrate_id=substrate_id,
            platform="twitter",
            platform_user_id=user_data.get("id"),
            username=user_data.get("username"),
            token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
        )
        account.set_access_token(access_token)
        if refresh_token:
            account.set_refresh_token(refresh_token)
        db.add(account)

    await db.commit()
    await db.refresh(account)

    return account.to_dict()
