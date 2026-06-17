import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pypdf
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Resume Screening API (Phase 2)")

# Allow React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your React app's Render URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class MatchResult(BaseModel):
    resume_id: str
    score: int
    matched_skills: List[str]
    missing_skills: List[str]
    explanation: str

def extract_text_from_pdf(file_obj) -> str:
    """Helper to parse text from a PDF file object."""
    try:
        reader = pypdf.PdfReader(file_obj)
        text = "".join([page.extract_text() + "\n" for page in reader.pages if page.extract_text()])
        return text
    except Exception as e:
        print(f"PDF Error: {e}")
        return ""

def evaluate_with_llm(jd_text: str, resume_text: str) -> dict:
    """Uses Groq Llama 3 to evaluate the resume and returns a JSON object."""
    prompt = f"""
    You are an expert AI technical recruiter. Evaluate the candidate's Resume against the Job Description.
    Analyze hard skills, experience context, and overall fit.

    Job Description:
    {jd_text}

    Resume:
    {resume_text}

    You MUST respond in valid JSON format exactly matching this structure:
    {{
        "score": (integer 0-100 based on overall fit),
        "matched_skills": [(list of key skills found in BOTH)],
        "missing_skills": [(list of important JD skills missing from the resume)],
        "explanation": "(2-3 sentences explaining your reasoning)"
    }}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.2, # Low temperature for consistent logic
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Groq API Error: {e}")
        return {
            "score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "explanation": "Failed to evaluate due to API error."
        }

@app.post("/match", response_model=List[MatchResult])
async def match_resumes(
    job_description: str = Form(""), 
    jd_file: UploadFile = File(None), 
    resumes: List[UploadFile] = File(...)
):
    if not resumes:
        raise HTTPException(status_code=400, detail="No resumes uploaded.")

    # 1. Handle JD PDF Upload if provided
    final_jd_text = job_description
    if jd_file and jd_file.filename:
        final_jd_text = extract_text_from_pdf(jd_file.file)
        
    if not final_jd_text.strip():
        raise HTTPException(status_code=400, detail="Please provide a Job Description via text or PDF.")

    results = []
    
    # 2. Process Resumes
    for resume in resumes:
        if not resume.filename.endswith('.pdf'):
            continue
            
        resume_text = extract_text_from_pdf(resume.file)
        if not resume_text.strip():
            continue
            
        # Call Groq LLM
        llm_response = evaluate_with_llm(final_jd_text, resume_text)
        
        results.append(MatchResult(
            resume_id=resume.filename,
            score=llm_response.get("score", 0),
            matched_skills=llm_response.get("matched_skills", []),
            missing_skills=llm_response.get("missing_skills", []),
            explanation=llm_response.get("explanation", "No explanation provided.")
        ))

    results.sort(key=lambda x: x.score, reverse=True)
    return results