from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

app = FastAPI(title="Smart Resume Screening API")

class ResumeInput(BaseModel):
    id: str
    text: str

class MatchRequest(BaseModel):
    job_description: str
    required_skills: List[str] = [] # Made optional
    resumes: List[ResumeInput]

class MatchResult(BaseModel):
    resume_id: str
    score: float
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    explanation: str

# A robust dictionary of common technical skills for auto-extraction
SKILLS_DICTIONARY = [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "Go", "Rust", "Ruby", "PHP",
    "FastAPI", "Flask", "Django", "Node.js", "Express", "React", "Angular", "Vue",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "DevOps", "Git",
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Firebase", "Oracle",
    "Machine Learning", "Deep Learning", "NLP", "Data Science", "Pandas", "NumPy",
    "HTML", "CSS", "Tailwind", "Bootstrap", "GraphQL", "REST API", "Microservices", "Zoho", "Power Platform"
]

def auto_extract_skills(text: str) -> List[str]:
    """Scans text against the SKILLS_DICTIONARY using word boundaries."""
    found_skills = []
    for skill in SKILLS_DICTIONARY:
        # Using regex to match whole words and ignore case (e.g., 'Go' won't match 'google')
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text.lower()):
            found_skills.append(skill)
    return found_skills

def extract_skills(text: str, required_skills: List[str]):
    text_lower = text.lower()
    matched = [skill for skill in required_skills if skill.lower() in text_lower]
    missing = [skill for skill in required_skills if skill.lower() not in text_lower]
    return matched, missing

@app.post("/match", response_model=List[MatchResult])
async def match_resumes(request: MatchRequest):
    if not request.resumes:
        raise HTTPException(status_code=400, detail="No resumes provided.")

    # Auto-extract skills from JD if none were manually specified
    target_skills = request.required_skills
    if not target_skills:
        target_skills = auto_extract_skills(request.job_description)
    
    # If still no skills found, fallback to generic evaluation
    documents = [request.job_description] + [r.text for r in request.resumes]
    
    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform(documents)
        cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    except ValueError:
        cosine_similarities = [0.0] * len(request.resumes)

    results = []
    for idx, resume in enumerate(request.resumes):
        matched, missing = extract_skills(resume.text, target_skills)
        
        text_score = max(0, min(100, cosine_similarities[idx] * 100))
        skill_score = (len(matched) / len(target_skills) * 100) if target_skills else text_score
        
        # 60% weight to matched skills, 40% weight to contextual similarity
        final_score = round((0.6 * skill_score) + (0.4 * text_score), 2)
        
        if final_score >= 75:
            expl = f"Strong match. Contains {len(matched)} key skills and aligns well with the JD context."
        elif final_score >= 50:
            expl = f"Moderate match. Shares contextual background but is missing critical skills like: {', '.join(missing[:2])}."
        else:
            expl = f"Weak match. Core skills are missing and semantic alignment is low."

        results.append(MatchResult(
            resume_id=resume.id,
            score=final_score,
            matched_skills=matched,
            missing_skills=missing,
            explanation=expl
        ))
        
    results.sort(key=lambda x: x.score, reverse=True)
    return results