## ProjectPulse

### Overview
ProjectPulse tracks delivery performance across projects with weekly check-ins, client feedback, risks, and automated health scoring. Admins manage projects, employees submit check-ins/risks, clients provide feedback, and flagged feedback auto-creates risks employees can resolve.

### Tech Stack
- Frontend: React + Vite + Tailwind
- Backend: Express (Node) + TypeScript
- Database: MongoDB (Mongoose)
- Auth: JWT

### Backend Choice
- Express server (server/server.ts) exposes REST endpoints for auth, projects, events (check-ins, feedback, risks, status changes).

### Setup
1) Prereqs: Node.js, MongoDB URI
2) Install root deps: `npm install`
3) Install server deps: `cd server && npm install`
4) Configure env in server/.env:
   - `MONGODB_URI=<your_uri>`
   - `JWT_SECRET=<secret>`
   - `PORT=5000` (optional)
5) Run backend: `cd server && npm run dev`
6) Run frontend: `npm run dev`

### Demo Logins
- Admin: admin@pp.com / password123
- Employee: employee@pp.com / password123
- Client: client@pp.com / password123

### Health Score Logic
Health score blends latest client feedback (satisfaction), employee confidence, schedule performance vs expected, and penalties for open risks/flagged issues. Scores map to status: ON_TRACK (≥80), AT_RISK (≥60), else CRITICAL.
