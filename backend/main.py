from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import anthropic
import pypdf
from pypdf import PdfWriter, PdfReader
from docx import Document
import tempfile
import os
import json
import re
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib import colors

app = FastAPI(title="JumpLite Resume Optimizer", version="1.0.0")
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        reader = PdfReader(tmp_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    finally:
        os.unlink(tmp_path)

def extract_text_from_docx(file_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        doc = Document(tmp_path)
        text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return text.strip()
    finally:
        os.unlink(tmp_path)

def score_resume(client: anthropic.Anthropic, resume_text: str, jd_text: str) -> dict:
    prompt = f"""You are an expert ATS (Applicant Tracking System) resume auditor.

Analyze this resume against the job description and return ONLY a valid JSON object with no other text.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

Return this exact JSON structure:
{{
  "score": <integer 0-100>,
  "keyword_match": <integer 0-100>,
  "missing_keywords": [<list of important missing keywords from JD>],
  "present_keywords": [<list of JD keywords found in resume>],
  "strengths": [<list of 3-5 genuine strengths>],
  "gaps": [<list of 3-5 specific gaps or missing elements>],
  "metadata_issues": [<list of metadata problems if any>],
  "review_tier": "<Top 1%|Top 3%|Top 5%|Top 10%|Top 15%|Top 25%|Middle|Low>"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)

def rewrite_resume(client: anthropic.Anthropic, resume_text: str, jd_text: str, missing_keywords: list) -> str:
    keywords_str = ", ".join(missing_keywords[:20]) if missing_keywords else "none identified"
    
    prompt = f"""You are an expert resume writer. Rewrite this resume to be optimized for the job description.

ORIGINAL RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

MISSING KEYWORDS TO ADD: {keywords_str}

Rules:
- Keep ALL real experience — never fabricate or exaggerate
- Reframe existing experience using JD language and keywords
- Add missing keywords naturally where they genuinely apply
- Keep same structure but strengthen every bullet point
- Lead with the most relevant experience for this role
- Make the professional summary directly target this role
- Keep it concise — no fluff

Return the complete rewritten resume text only. No commentary before or after."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text.strip()

def generate_metadata(client: anthropic.Anthropic, resume_text: str, jd_text: str) -> dict:
    prompt = f"""Based on this resume and job description, generate optimal PDF metadata.
Return ONLY a valid JSON object with no other text.

RESUME (first 500 chars): {resume_text[:500]}
JOB DESCRIPTION (first 500 chars): {jd_text[:500]}

Return this exact JSON:
{{
  "title": "<Job Title> — Application",
  "subject": "<Department/Team> — <Role> Application",
  "keywords": "<comma separated list of 15-20 most important ATS keywords from the JD>"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)

def create_optimized_pdf(resume_text: str, metadata: dict) -> str:
    output_path = tempfile.mktemp(suffix=".pdf")
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        title=metadata.get("title", "Resume"),
        author="",
        subject=metadata.get("subject", "Resume Application"),
        creator="Microsoft Word",
        producer="Microsoft Word",
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'ResumeTitle',
        parent=styles['Normal'],
        fontSize=14,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=4,
        textColor=colors.HexColor('#1B3A6B')
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        spaceBefore=12,
        spaceAfter=4,
        textColor=colors.HexColor('#1B3A6B'),
        borderPadding=(0, 0, 2, 0),
    )
    
    body_style = ParagraphStyle(
        'ResumeBody',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        spaceAfter=3,
        leading=14,
    )
    
    bullet_style = ParagraphStyle(
        'ResumeBullet',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        spaceAfter=2,
        leading=13,
        leftIndent=16,
        bulletIndent=4,
    )
    
    story = []
    lines = resume_text.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 4))
            continue
        
        if i == 0 and len(line) < 60:
            story.append(Paragraph(line, title_style))
        elif (line.isupper() and len(line) < 50) or (
            any(keyword in line.upper() for keyword in [
                'PROFESSIONAL SUMMARY', 'EXPERIENCE', 'EDUCATION',
                'SKILLS', 'CERTIFICATIONS', 'QUALIFICATIONS', 'OBJECTIVE'
            ])
        ):
            story.append(Paragraph(line, section_style))
        elif line.startswith('•') or line.startswith('-') or line.startswith('*'):
            clean = line.lstrip('•-* ').strip()
            story.append(Paragraph(f'• {clean}', bullet_style))
        else:
            story.append(Paragraph(line, body_style))
    
    doc.build(story)
    
    reader = PdfReader(output_path)
    writer = PdfWriter()
    
    for page in reader.pages:
        writer.add_page(page)
    
    now = datetime.now()
    date_str = now.strftime("D:%Y%m%d%H%M%S")
    
    writer.add_metadata({
        '/Title': metadata.get('title', 'Resume'),
        '/Author': '',
        '/Subject': metadata.get('subject', 'Resume Application'),
        '/Keywords': metadata.get('keywords', ''),
        '/Creator': 'Microsoft Word',
        '/Producer': 'Microsoft Word',
        '/CreationDate': date_str,
        '/ModDate': date_str,
    })
    
    final_path = tempfile.mktemp(suffix="_optimized.pdf")
    with open(final_path, 'wb') as f:
        writer.write(f)
    
    os.unlink(output_path)
    return final_path


@app.post("/api/score")
async def score_only(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    try:
        file_bytes = await resume.read()
        
        if resume.filename.lower().endswith('.pdf'):
            resume_text = extract_text_from_pdf(file_bytes)
        elif resume.filename.lower().endswith('.docx'):
            resume_text = extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Please upload a PDF or DOCX file")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from resume")
        
        score_data = score_resume(client, resume_text, job_description)
        return {"success": True, "score_data": score_data, "resume_text": resume_text}
    
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key. Check your Anthropic API key.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned unexpected format. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/optimize")
async def optimize_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    try:
        file_bytes = await resume.read()
        
        if resume.filename.lower().endswith('.pdf'):
            resume_text = extract_text_from_pdf(file_bytes)
        elif resume.filename.lower().endswith('.docx'):
            resume_text = extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Please upload a PDF or DOCX file")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from resume")
        
        original_score = score_resume(client, resume_text, job_description)
        rewritten_text = rewrite_resume(client, resume_text, job_description, original_score.get('missing_keywords', []))
        new_score = score_resume(client, rewritten_text, job_description)
        metadata = generate_metadata(client, rewritten_text, job_description)
        pdf_path = create_optimized_pdf(rewritten_text, metadata)
        
        return {
            "success": True,
            "original_score": original_score,
            "new_score": new_score,
            "metadata": metadata,
            "rewritten_text": rewritten_text,
            "download_id": os.path.basename(pdf_path),
            "download_path": pdf_path
        }
    
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key. Check your Anthropic API key.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned unexpected format. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download/{filename}")
async def download_pdf(filename: str):
    tmp_dir = tempfile.gettempdir()
    file_path = os.path.join(tmp_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found or expired")
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename="optimized_resume.pdf"
    )


@app.get("/")
async def root():
    return {"message": "JumpLite Resume Optimizer API", "version": "1.0.0", "status": "running"}
