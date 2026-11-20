import logging
import os
from datetime import date
from pathlib import Path
from typing import Annotated
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from httpx import HTTPError
from postgrest.exceptions import APIError
from pydantic import BaseModel, Field
from supabase import Client, create_client
from supabase_auth.errors import AuthApiError

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

app = FastAPI(title="Laxmi Legal Firm API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

logger = logging.getLogger(__name__)
APPOINTMENT_SELECT = (
    "id, service_id, booking_date, booking_time, duration_hours, status, "
    "service:services(service_name)"
)


class AppointmentInput(BaseModel):
    service_id: UUID
    booking_date: date
    booking_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    duration_hours: int = Field(ge=1, le=3)


def new_supabase_client() -> Client:
    project_url = os.getenv("SUPABASE_URL")
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not project_url or not publishable_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY "
                "in legal-api/.env."
            ),
        )
    if publishable_key.startswith("sb_secret_"):
        raise HTTPException(
            status_code=503,
            detail="Use a publishable key for this API, not a Supabase secret key.",
        )
    try:
        return create_client(project_url, publishable_key)
    except ValueError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase configuration is invalid: {error}",
        ) from None


def authenticated_client(
    authorization: Annotated[str | None, Header()] = None,
) -> tuple[Client, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in to continue.")

    access_token = authorization.removeprefix("Bearer ").strip()
    if not access_token:
        raise HTTPException(status_code=401, detail="Sign in to continue.")

    client = new_supabase_client()
    try:
        user_response = client.auth.get_user(access_token)
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired.") from None
    except HTTPError:
        raise HTTPException(
            status_code=503,
            detail="Could not reach Supabase to verify your session.",
        ) from None

    if not user_response.user:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired.")

    client.postgrest.auth(access_token)
    return client, str(user_response.user.id)


def database_request(request):
    try:
        return request()
    except APIError as error:
        logger.warning("Supabase database request failed: %s", error.message)
        raise HTTPException(
            status_code=503,
            detail=f"Supabase database request failed: {error.message}",
        ) from None
    except HTTPError:
        raise HTTPException(
            status_code=503,
            detail="Could not reach the Supabase database.",
        ) from None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/services")
def list_services():
    client = new_supabase_client()
    return database_request(
        lambda: client.table("services")
        .select("id, service_name, description")
        .eq("is_active", True)
        .order("service_name")
        .execute()
        .data
    )


@app.get("/appointments")
def list_appointments(
    auth: Annotated[tuple[Client, str], Depends(authenticated_client)],
):
    client, client_id = auth
    return database_request(
        lambda: client.table("client_appointments")
        .select(APPOINTMENT_SELECT)
        .eq("client_id", client_id)
        .order("booking_date")
        .order("booking_time")
        .execute()
        .data
    )


@app.post("/appointments", status_code=201)
def create_appointment(
    payload: AppointmentInput,
    auth: Annotated[tuple[Client, str], Depends(authenticated_client)],
):
    if payload.booking_date < date.today():
        raise HTTPException(status_code=422, detail="Choose today or a future date.")

    client, client_id = auth
    rows = database_request(
        lambda: client.table("client_appointments")
        .insert({**payload.model_dump(mode="json"), "client_id": client_id})
        .select(APPOINTMENT_SELECT)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=502, detail="Supabase returned no created appointment.")
    return rows[0]


@app.put("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: UUID,
    payload: AppointmentInput,
    auth: Annotated[tuple[Client, str], Depends(authenticated_client)],
):
    if payload.booking_date < date.today():
        raise HTTPException(status_code=422, detail="Choose today or a future date.")

    client, client_id = auth
    rows = database_request(
        lambda: client.table("client_appointments")
        .update(payload.model_dump(mode="json"))
        .eq("id", str(appointment_id))
        .eq("client_id", client_id)
        .select(APPOINTMENT_SELECT)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Pending appointment not found or cannot be rescheduled.",
        )
    return rows[0]


@app.delete("/appointments/{appointment_id}", status_code=204)
def delete_appointment(
    appointment_id: UUID,
    auth: Annotated[tuple[Client, str], Depends(authenticated_client)],
):
    client, client_id = auth
    rows = database_request(
        lambda: client.table("client_appointments")
        .delete()
        .eq("id", str(appointment_id))
        .eq("client_id", client_id)
        .select("id")
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return Response(status_code=204)
