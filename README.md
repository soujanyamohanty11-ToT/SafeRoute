# 🚨 SafeRoute — Smart Emergency Evacuation App

SafeRoute is a Discrete Mathematics based web application that models a college building as a graph and finds suitable evacuation routes during emergencies.

## Concepts Used
- Graphs and Digraphs
- Relations
- Paths
- Warshall's Algorithm (reachability)
- Breadth-First Search (route finding)
- Logic-based route safety checks
- Pigeonhole Principle (basic exit-capacity allocation)

## Tech Stack
- Frontend: React + Vite
- Backend: Python + FastAPI
- Data: JSON
- Graph visualization: React Flow

## Project Structure
```text
SafeRoute/
├── frontend/
├── backend/
│   ├── algorithms/
│   ├── data/
│   └── main.py
└── README.md
```

## Run Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

## Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Demo
Choose a starting location and emergency. SafeRoute applies the selected emergency's blocked paths, checks which exits remain reachable, finds a route using BFS, and displays exit capacity information.
