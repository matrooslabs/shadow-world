import httpx
from typing import Optional


class TwitterFetcher:
    """Fetches tweets and user data from Twitter API v2."""

    BASE_URL = "https://api.twitter.com/2"

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {"Authorization": f"Bearer {access_token}"}

    async def get_user_info(self) -> dict:
        """Get the authenticated user's information."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me",
                headers=self.headers,
                params={
                    "user.fields": "id,name,username,description,profile_image_url,public_metrics"
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_user_tweets(
        self, user_id: str, max_results: int = 100, pagination_token: Optional[str] = None
    ) -> dict:
        """Get user's recent tweets."""
        params = {
            "max_results": min(max_results, 100),
            "tweet.fields": "created_at,public_metrics,conversation_id,in_reply_to_user_id",
            "exclude": "retweets",  # Only original tweets
        }
        if pagination_token:
            params["pagination_token"] = pagination_token

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/{user_id}/tweets",
                headers=self.headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()

    async def fetch_all_tweets(self, max_tweets: int = 500) -> list[dict]:
        """Fetch all available tweets up to max_tweets."""
        # First get user info
        user_data = await self.get_user_info()
        user_id = user_data["data"]["id"]

        all_tweets = []
        pagination_token = None

        while len(all_tweets) < max_tweets:
            result = await self.get_user_tweets(
                user_id,
                max_results=min(100, max_tweets - len(all_tweets)),
                pagination_token=pagination_token,
            )

            if "data" in result:
                all_tweets.extend(result["data"])

            # Check for pagination
            if "meta" in result and "next_token" in result["meta"]:
                pagination_token = result["meta"]["next_token"]
            else:
                break

        return all_tweets

    async def get_content_for_extraction(self) -> dict:
        """Get all content needed for personality extraction."""
        user_data = await self.get_user_info()
        tweets = await self.fetch_all_tweets(max_tweets=5)

        return {
            "user": user_data.get("data", {}),
            "tweets": tweets,
            "platform": "twitter",
        }
