from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from db import get_db
from models import Substrate, SubstrateStatus, SocialAccount
from agents import ExtractionAgent
from fetchers import TwitterFetcher

router = APIRouter(prefix="/substrates", tags=["substrates"])


class CreateSubstrateRequest(BaseModel):
    owner_wallet: str
    display_name: str
    bio: Optional[str] = None


class SubstrateResponse(BaseModel):
    id: str
    owner_wallet: str
    display_name: str
    bio: Optional[str]
    avatar_url: Optional[str]
    personality_profile: Optional[dict]
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=SubstrateResponse)
async def create_substrate(
    request: CreateSubstrateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new substrate."""
    substrate = Substrate(
        owner_wallet=request.owner_wallet,
        display_name=request.display_name,
        bio=request.bio,
        status=SubstrateStatus.PENDING,
    )
    db.add(substrate)
    await db.commit()
    await db.refresh(substrate)

    return SubstrateResponse(**substrate.to_dict())


@router.get("", response_model=list[SubstrateResponse])
async def list_substrates(
    owner_wallet: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all substrates, optionally filtered by owner."""
    query = select(Substrate).order_by(Substrate.created_at.desc()).limit(limit)

    if owner_wallet:
        query = query.where(Substrate.owner_wallet == owner_wallet)

    result = await db.execute(query)
    substrates = result.scalars().all()

    return [SubstrateResponse(**s.to_dict()) for s in substrates]


@router.get("/{substrate_id}", response_model=SubstrateResponse)
async def get_substrate(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific substrate by ID."""
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()

    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    return SubstrateResponse(**substrate.to_dict())


@router.get("/{substrate_id}/status")
async def get_substrate_status(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get substrate extraction status."""
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()

    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    return {
        "status": substrate.status.value if substrate.status else "pending",
        "progress": int(substrate.extraction_progress or 0),
    }


@router.get("/{substrate_id}/social-accounts")
async def get_social_accounts(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get social accounts connected to a substrate."""
    result = await db.execute(
        select(SocialAccount).where(SocialAccount.substrate_id == substrate_id)
    )
    accounts = result.scalars().all()

    return [a.to_dict() for a in accounts]


async def run_extraction(substrate_id: str, db: AsyncSession):
    """Background task to run personality extraction."""
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()

    if not substrate:
        return

    # Get social accounts
    accounts_result = await db.execute(
        select(SocialAccount).where(SocialAccount.substrate_id == substrate_id)
    )
    accounts = accounts_result.scalars().all()

    if not accounts:
        substrate.status = SubstrateStatus.FAILED
        await db.commit()
        return

    try:
        # Update status
        substrate.status = SubstrateStatus.EXTRACTING
        substrate.extraction_progress = "10"
        await db.commit()

        # Fetch content from all connected platforms
        all_content = {"tweets": [], "user": {}}

        for account in accounts:
            if account.platform == "twitter":
                access_token = account.get_access_token()
                if access_token:
                    fetcher = TwitterFetcher(access_token)
                    content = await fetcher.get_content_for_extraction()
                    all_content["tweets"].extend(content.get("tweets", []))
                    if content.get("user"):
                        all_content["user"] = content["user"]

        substrate.extraction_progress = "30"
        await db.commit()

        # Run extraction agent
        agent = ExtractionAgent()
        personality_profile = await agent.extract(all_content)

        if "error" in personality_profile:
            substrate.status = SubstrateStatus.FAILED
            await db.commit()
            return

        # Update substrate with results
        substrate.personality_profile = personality_profile
        substrate.status = SubstrateStatus.READY
        substrate.extraction_progress = "100"

        # Update avatar from Twitter if available
        if all_content["user"].get("profile_image_url"):
            substrate.avatar_url = all_content["user"]["profile_image_url"].replace(
                "_normal", ""
            )

        await db.commit()

    except Exception as e:
        print(f"Extraction failed: {e}")
        substrate.status = SubstrateStatus.FAILED
        await db.commit()


@router.post("/{substrate_id}/extract")
async def trigger_extraction(
    substrate_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger personality extraction for a substrate."""
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()

    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    # Check if already extracting
    if substrate.status == SubstrateStatus.EXTRACTING:
        raise HTTPException(status_code=400, detail="Extraction already in progress")

    # Check if has social accounts
    accounts_result = await db.execute(
        select(SocialAccount).where(SocialAccount.substrate_id == substrate_id)
    )
    accounts = accounts_result.scalars().all()

    if not accounts:
        raise HTTPException(
            status_code=400,
            detail="No social accounts connected. Please connect at least one account.",
        )

    # Start extraction in background
    background_tasks.add_task(run_extraction, substrate_id, db)

    return {"message": "Extraction started"}
