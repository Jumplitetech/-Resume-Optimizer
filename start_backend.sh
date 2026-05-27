#!/bin/bash
echo "Starting JumpLite Resume Optimizer Backend..."
echo ""
cd "$(dirname "$0")/backend"
pip install fastapi uvicorn python-multipart anthropic pypdf python-docx reportlab --break-system-packages -q
echo "Backend running at http://localhost:8000"
echo "Press Ctrl+C to stop."
uvicorn main:app --reload --port 8000
