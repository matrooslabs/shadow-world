import httpx
from bs4 import BeautifulSoup


async def fetch_url_content(url: str) -> dict:
    """Fetch and extract text content from a URL.

    Returns {"title": str|None, "content": str, "error": str|None}
    """
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract title
        title = None
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(strip=True)

        # Remove non-content tags
        for tag in soup.find_all(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Extract text from content tags
        content_tags = soup.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "article", "blockquote"])
        text_parts = []
        for tag in content_tags:
            text = tag.get_text(strip=True)
            if text:
                text_parts.append(text)

        content = "\n\n".join(text_parts)

        if not content.strip():
            # Fallback: extract all visible text from body
            body = soup.find("body")
            if body:
                content = body.get_text(separator="\n", strip=True)

        return {"title": title, "content": content, "error": None}

    except httpx.HTTPStatusError as e:
        return {"title": None, "content": "", "error": f"HTTP {e.response.status_code}: {str(e)}"}
    except Exception as e:
        return {"title": None, "content": "", "error": str(e)}
