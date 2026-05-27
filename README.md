# JumpLite Resume Optimizer

**Free, open source resume optimization tool built by JumpLite Tech Nonprofit.**

Upload your resume, paste a job description, and get:
- ATS score before and after (0–100)
- Missing keywords identified
- AI-rewritten resume optimized for the role
- PDF download with metadata already set — no Sejda needed

---

## How to Run Locally

### Step 1 — Get your Anthropic API Key
Go to https://console.anthropic.com and create a free account.
New accounts get $5 in free credits — enough for ~100 resume optimizations.
Copy your API key (starts with sk-ant-).

### Step 2 — Start the Backend

Open a terminal and run:

```bash
cd resumeoptimizer
chmod +x start_backend.sh
./start_backend.sh
```

The backend runs at http://localhost:8000

### Step 3 — Start the Frontend

Open a second terminal and run:

```bash
cd resumeoptimizer
chmod +x start_frontend.sh
./start_frontend.sh
```

The app opens at http://localhost:3000

### Step 4 — Use the App

1. Paste your Anthropic API key into the app
2. Upload your resume (PDF or DOCX)
3. Paste the full job description
4. Click Optimize — get your score and optimized PDF

---

## What It Does

| Feature | Description |
|---|---|
| ATS Scoring | Scores your resume 0–100 against the JD |
| Keyword Analysis | Shows what JD keywords are present and missing |
| AI Rewrite | Rewrites resume with optimized language and keywords |
| Before vs After | Shows score improvement side by side |
| PDF Metadata | Writes Title, Subject, Keywords, Creator, Producer into the PDF automatically |
| Privacy | Your resume and API key never leave your machine |

---

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Python + FastAPI
- **AI**: Anthropic Claude API (claude-sonnet-4)
- **PDF**: pypdf, ReportLab
- **Resume parsing**: pypdf, python-docx

---

## Contributing

This project is open source under the MIT License.
Built by JumpLite Tech — a nonprofit dedicated to digital literacy and technology access.

To contribute:
1. Fork the repo
2. Create a branch: git checkout -b feature/your-feature
3. Commit and push
4. Open a pull request

---

## Cost

Running locally: ~$0.03–0.08 per resume optimization (Claude API).
Everything else is free.

---

## License

MIT License — free to use, fork, and build on.
