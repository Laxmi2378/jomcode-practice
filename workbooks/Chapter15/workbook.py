import logging
import os
from pathlib import Path
from typing import Callable, TypeVar

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from httpx import HTTPError
from postgrest.exceptions import APIError
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

app = FastAPI(title="Chapter 15 practice API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)
router = APIRouter(prefix="/lesson-posts")
TABLE_NAME = "jomcode_lesson_posts"
logger = logging.getLogger(__name__)
Result = TypeVar("Result")


class PostInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)


def supabase_client() -> Client:
    project_url = os.getenv("SUPABASE_URL")
    secret_key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    if not project_url or not secret_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Set SUPABASE_URL and a server-only SUPABASE_SECRET_KEY "
                "in the Chapter 15 .env file."
            ),
        )
    if secret_key.startswith("sb_publishable_"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Use a server-only Supabase secret key, not a publishable key."
            ),
        )

    try:
        return create_client(project_url, secret_key)
    except ValueError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase configuration is invalid: {error}",
        ) from None


def supabase_request(request: Callable[[], Result]) -> Result:
    try:
        return request()
    except APIError as error:
        logger.warning("Supabase request failed: %s", error.message)
        raise HTTPException(
            status_code=503,
            detail=f"Supabase request failed: {error.message}",
        ) from None
    except HTTPError:
        raise HTTPException(
            status_code=503,
            detail="Could not reach Supabase. Check the project URL and network connection.",
        ) from None


@router.get("")
def list_posts():
    client = supabase_client()
    return supabase_request(
        lambda: client.table(TABLE_NAME)
        .select("*")
        .order("id")
        .execute()
        .data
    )


@router.post("", status_code=201)
def create_post(payload: PostInput):
    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=422,
            detail="Title must contain at least one non-whitespace character.",
        )

    client = supabase_client()
    rows = supabase_request(
        lambda: client.table(TABLE_NAME)
        .insert({"title": title})
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=502, detail="Supabase returned no created post.")
    return rows[0]


@router.put("/{post_id}")
def update_post(post_id: int, payload: PostInput):
    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=422,
            detail="Title must contain at least one non-whitespace character.",
        )

    client = supabase_client()
    rows = supabase_request(
        lambda: client.table(TABLE_NAME)
        .update({"title": title})
        .eq("id", post_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Post not found")
    return rows[0]


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: int):
    client = supabase_client()
    rows = supabase_request(
        lambda: client.table(TABLE_NAME)
        .delete()
        .eq("id", post_id)
        .select("id")
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Post not found")
    return Response(status_code=204)


app.include_router(router)
