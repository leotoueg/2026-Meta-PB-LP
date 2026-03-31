from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Webhook URL (to be configured)
QUIZ_WEBHOOK_URL = os.environ.get('QUIZ_WEBHOOK_URL', '')
APPOINTMENT_WEBHOOK_URL = os.environ.get('APPOINTMENT_WEBHOOK_URL', '')

# Define Models
class QuizSubmission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    home_type: str
    timeline: str
    address: str
    city: str
    zipcode: str
    full_name: str
    phone: str
    email: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizSubmissionCreate(BaseModel):
    home_type: str
    timeline: str
    address: str
    city: str
    zipcode: str
    full_name: str
    phone: str
    email: EmailStr

class AppointmentBooking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quiz_id: str
    date: str
    time: str
    full_name: str
    phone: str
    email: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentBookingCreate(BaseModel):
    quiz_id: str
    date: str
    time: str
    full_name: str
    phone: str
    email: EmailStr

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Apex Bath Remodeling & Pros API"}

@api_router.post("/quiz/submit")
async def submit_quiz(submission: QuizSubmissionCreate):
    """Submit quiz data and send to webhook"""
    quiz_obj = QuizSubmission(**submission.model_dump())
    
    # Convert to dict and serialize datetime
    doc = quiz_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    # Store in MongoDB
    await db.quiz_submissions.insert_one(doc)
    
    # Send to webhook if configured
    if QUIZ_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(QUIZ_WEBHOOK_URL, json=doc, timeout=10.0)
                logger.info(f"Quiz webhook sent successfully for {quiz_obj.id}")
        except Exception as e:
            logger.error(f"Failed to send quiz webhook: {e}")
    
    return {"id": quiz_obj.id, "message": "Quiz submitted successfully"}

@api_router.post("/appointment/book")
async def book_appointment(booking: AppointmentBookingCreate):
    """Book an appointment and send to webhook"""
    appointment_obj = AppointmentBooking(**booking.model_dump())
    
    # Convert to dict and serialize datetime
    doc = appointment_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    # Store in MongoDB
    await db.appointments.insert_one(doc)
    
    # Send to webhook if configured
    if APPOINTMENT_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(APPOINTMENT_WEBHOOK_URL, json=doc, timeout=10.0)
                logger.info(f"Appointment webhook sent successfully for {appointment_obj.id}")
        except Exception as e:
            logger.error(f"Failed to send appointment webhook: {e}")
    
    return {"id": appointment_obj.id, "message": "Appointment booked successfully"}

@api_router.get("/quiz/submissions", response_model=List[QuizSubmission])
async def get_quiz_submissions():
    """Get all quiz submissions (for admin purposes)"""
    submissions = await db.quiz_submissions.find({}, {"_id": 0}).to_list(1000)
    for sub in submissions:
        if isinstance(sub['timestamp'], str):
            sub['timestamp'] = datetime.fromisoformat(sub['timestamp'])
    return submissions

@api_router.get("/appointments", response_model=List[AppointmentBooking])
async def get_appointments():
    """Get all appointments (for admin purposes)"""
    appointments = await db.appointments.find({}, {"_id": 0}).to_list(1000)
    for apt in appointments:
        if isinstance(apt['timestamp'], str):
            apt['timestamp'] = datetime.fromisoformat(apt['timestamp'])
    return appointments

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
