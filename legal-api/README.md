# Laxmi Legal Firm API

This FastAPI service handles legal-service and appointment database requests.
Supabase Auth remains responsible for sign-in; the API verifies the client's
access token and forwards it to PostgREST so the existing Row Level Security
policies continue to protect each client's appointments.

## Run locally

1. Copy `.env.example` to `.env` and set `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY`. Never use a secret/service-role key here.
2. Install dependencies with `pip install -r requirements.txt`.
3. Start the API from this directory with
   `uvicorn main:app --reload --host 127.0.0.1 --port 8000`.
4. Open `http://127.0.0.1:8000/docs` to inspect the API.

The API provides `GET /services`, `GET /appointments`, `POST /appointments`,
`PUT /appointments/{appointment_id}`, and
`DELETE /appointments/{appointment_id}`.
