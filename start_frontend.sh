#!/bin/bash
echo "Starting JumpLite Resume Optimizer Frontend..."
echo ""
cd "$(dirname "$0")/frontend"
npm install
echo "Frontend opening at http://localhost:3000"
echo "Press Ctrl+C to stop."
npm run dev
