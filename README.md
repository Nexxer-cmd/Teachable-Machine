# 🧠 Teachable Machine Pro

> **Train your own AI. No code. No cost.**

A browser-based machine learning tool that lets users train custom classifiers using their own data (images, text, audio, CSV), visualize training in real time, and test models instantly — all without writing code.

![Teachable Machine Pro](https://img.shields.io/badge/Cost-$0-brightgreen) ![TensorFlow.js](https://img.shields.io/badge/ML-TensorFlow.js-orange) ![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-blue) ![React](https://img.shields.io/badge/Frontend-React%2018-61dafb) ![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)

## ✨ Features

- **Multi-modal training**: Image (webcam/upload), Text, Audio, CSV
- **Real-time training**: Live loss/accuracy charts (TensorFlow.js, 100% in-browser)
- **Class management**: Add, rename, delete classes with sample counts
- **Instant inference**: Test model with new input immediately after training
- **Model export**: Download as TensorFlow.js zip or JSON snapshot
- **AI assistant**: Gemini-powered sidebar for ML tutoring and diagnosis
- **Project save/load**: localStorage persistence, export as JSON
- **Gallery**: Pre-built example projects (face expression, sentiment, gestures)
- **Dark/light mode**: Beautiful, modern UI with smooth animations

## 🛠️ Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | React 18 + TypeScript + Vite | Free |
| Styling | TailwindCSS v4 | Free |
| State | Zustand | Free |
| In-browser ML | TensorFlow.js | Free |
| Charts | Recharts | Free |
| Animation | Framer Motion | Free |
| Backend | Python 3.11 + FastAPI | Free |
| AI | Google Gemini API (gemini-1.5-flash) | Free |
| Frontend Host | Vercel | Free |
| Backend Host | Render.com | Free |

## 🚀 Quick Start

### Frontend (React)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173

### Backend (FastAPI)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Get your free Gemini API key from https://aistudio.google.com/app/apikey
# Add it to backend/.env
echo "GEMINI_API_KEY=your-key-here" > .env

# Start server
uvicorn main:app --reload --port 8000
```

## 📁 Project Structure

```
teachable-machine-pro/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx           # Top navigation bar
│   │   ├── ClassManager.tsx     # Left sidebar — class CRUD
│   │   ├── StepIndicator.tsx    # Data → Train → Test steps
│   │   ├── AIAssistant.tsx      # Right panel — Gemini chat
│   │   ├── Inference.tsx        # Test/predict with confidence bars
│   │   ├── ExportModal.tsx      # Model export options
│   │   ├── capture/
│   │   │   ├── ImageCapture.tsx # Webcam + drag-drop upload
│   │   │   ├── TextCapture.tsx  # Text input with chips
│   │   │   └── AudioCapture.tsx # Mic recording + waveform
│   │   └── charts/
│   │       └── TrainingCharts.tsx # Live loss/accuracy charts
│   ├── lib/
│   │   ├── trainer.ts           # TensorFlow.js ML engine
│   │   └── gemini.ts            # Gemini API client (via backend)
│   ├── store/
│   │   ├── index.ts             # Combined Zustand store
│   │   ├── projectSlice.ts      # Project/class/sample state
│   │   ├── trainingSlice.ts     # Training lifecycle state
│   │   └── uiSlice.ts           # UI state (step, panels, theme)
│   ├── types/index.ts           # TypeScript type definitions
│   ├── constants/index.ts       # All UI strings + config
│   ├── pages/
│   │   ├── Home.tsx             # Landing page + gallery
│   │   └── Workspace.tsx        # Main 3-panel workspace
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Design system + global styles
├── backend/
│   ├── main.py                  # FastAPI server
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment template
│   └── .env                     # Your API keys (gitignored)
├── index.html                   # HTML entry with SEO meta
├── vite.config.ts               # Vite + React + Tailwind config
├── tsconfig.json                # TypeScript config
└── package.json                 # NPM dependencies
```

## 🎓 How It Works

1. **Add Data**: Capture images via webcam, type text samples, record audio, or upload CSV
2. **Train**: Configure epochs/LR/batch size → TensorFlow.js trains entirely in your browser
3. **Test**: Feed new data → see real-time confidence bars per class
4. **Export**: Download as TensorFlow.js package or JSON snapshot

All ML training happens **in your browser** via TensorFlow.js — no GPU server needed, completely private, 100% free.

## 🔑 Getting a Free Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Add it to `backend/.env` as `GEMINI_API_KEY=your-key`

**Free limits**: 15 requests/minute, 1500 requests/day — more than enough for development!

## 📄 License

MIT — Free for students, educators, and researchers.
