import streamlit as st
import requests
import pypdf
import os

st.set_page_config(page_title="AI Resume Screener", page_icon="📄", layout="wide")

st.title("📄 Smart PDF Resume Screening System")
st.write("Upload a Job Description and Resumes in PDF format to parse and evaluate them instantly.")

# Render uses environment variables. If not set, it defaults to localhost
API_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000/match")

def extract_text_from_pdf(uploaded_file):
    """Helper to parse text from an uploaded PDF file."""
    try:
        reader = pypdf.PdfReader(uploaded_file)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        st.error(f"Error reading {uploaded_file.name}: {e}")
        return ""

col1, col2 = st.columns([1, 1], gap="large")

with col1:
    st.subheader("1. Job Description Setup")
    jd_source = st.radio("How would you like to provide the JD?", ["Upload PDF", "Paste Text"])
    
    jd_text = ""
    if jd_source == "Upload PDF":
        jd_file = st.file_uploader("Upload Job Description (PDF)", type=["pdf"])
        if jd_file:
            jd_text = extract_text_from_pdf(jd_file)
            st.info("✅ Job Description parsed successfully from PDF.")
    else:
        jd_text = st.text_area("Paste Job Description", height=150)

    # Optional hard override skills
    manual_skills = st.text_input("Target Skills Override (Optional)", placeholder="e.g. Python, AWS (Leave blank for auto-extraction)")

    st.subheader("2. Candidate Resumes")
    resume_files = st.file_uploader("Upload Candidate Resumes (PDFs)", type=["pdf"], accept_multiple_files=True)

with col2:
    st.subheader("3. Screening Results")
    
    if st.button("🚀 Screen Candidates", type="primary", use_container_width=True):
        if not jd_text.strip():
            st.warning("⚠️ Please provide a Job Description via PDF or text.")
        elif not resume_files:
            st.warning("⚠️ Please upload at least one candidate resume PDF.")
        else:
            # Process uploaded resumes
            processed_resumes = []
            with st.spinner("Extracting text from PDF resumes..."):
                for f in resume_files:
                    txt = extract_text_from_pdf(f)
                    if txt.strip():
                        processed_resumes.append({"id": f.name, "text": txt})

            if not processed_resumes:
                st.error("Could not extract legible text from any uploaded resume.")
            else:
                # Prepare skills list if manually inputted
                skills_list = [s.strip() for s in manual_skills.split(",") if s.strip()] if manual_skills else []
                
                payload = {
                    "job_description": jd_text,
                    "required_skills": skills_list,
                    "resumes": processed_resumes
                }
                
                # Request matching from Backend API
                try:
                    with st.spinner("Analyzing and scoring..."):
                        response = requests.post(API_URL, json=payload)
                        response.raise_for_status()
                        results = response.json()
                    
                    st.success("Screening Complete!")
                    for res in results:
                        score = res['score']
                        color = "green" if score >= 75 else "orange" if score >= 50 else "red"
                        
                        with st.container():
                            st.markdown(f"### {res['resume_id']} — <span style='color:{color}'>{score}/100</span>", unsafe_allow_html=True)
                            st.progress(score / 100)
                            st.write(f"**Verdict:** {res['explanation']}")
                            if res.get('matched_skills'):
                                st.write(f"✅ **Matched Skills:** {', '.join(res['matched_skills'])}")
                            if res.get('missing_skills'):
                                st.write(f"❌ **Missing Skills:** {', '.join(res['missing_skills'])}")
                            st.divider()
                            
                except requests.exceptions.RequestException as e:
                    st.error(f"Could not connect to the backend server. Verify your configuration. Error: {e}")