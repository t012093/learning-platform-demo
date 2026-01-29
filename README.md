<div align="center">
<img width="1200" height="400" alt="Lumina Banner" src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200" style="border-radius: 20px;" />

# Lumina Learning Platform
### The Next-Gen Immersive Learning Experience
</div>

<br/>

**Lumina** is a modern, experimental learning platform designed to revolutionize how we learn engineering, creativity, and languages. Unlike traditional LMS, Lumina focuses on **"Vibe"**—the feeling of flow, immersion, and narrative-driven education.

## 🌟 Key Features

### 1. **AI-Powered Personalized Curriculums** ✨
Experience learning tailored just for you.
- **Big5 Personality Integration**: AI dynamically adapts curriculum content, tone, and learning style based on your Big5 personality traits.
- **Rich Content Generation**: Lessons go beyond summaries, providing 'Why It Matters', 'Key Concepts', 'Action Steps', and 'Analogies'.
- **Advanced AI Models**: Utilizing **Google Gemini 3.0 Pro** for deep reasoning and **Gemini 2.0 Flash** for high-speed generation.
- **RAG (Retrieval-Augmented Generation)**: Integrates with specific knowledge domains (like Blender documentation) to ground AI responses.

### 2. **Immersive Audio Experience (In Progress)** 🎧
- **Gemini Native TTS**: High-quality, context-aware narration using Gemini 2.5/2.0 Native Audio capabilities (replacing legacy Python gTTS).
- **Character-Driven**: Voices that match the persona of the AI tutor (Lumina).

### 3. **Diverse Learning Paths** 🗺️
- **Vibe Coding Path**: Narrative-driven coding (Prompt Engineering, Git) set in a sci-fi universe.
- **Dev Campus**: Web Basics (React/TS) and Gen AI application development.
- **3D Creative Lab**: Blender 3D modeling and sculpting.
- **Art Atelier**: Art History and Design Philosophy.
- **Global Communication**: English for global engineers.

---

## 🛠 Tech Stack

- **Frontend**: [React](https://react.dev/) (v19) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **AI/LLM**: [Google Gemini API](https://ai.google.dev/) via `@google/genai` SDK
- **Backend/Service**: Node.js (Express) for local proxying and audio handling.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State/Routing**: React Context + Custom View-based routing.

---

## 🚀 Getting Started for Engineers

### Quick Start (UI Only)
If you want to explore the UI without wiring the full backend, you can run the frontend only:

```bash
npm install
npm run dev
# Frontend: http://localhost:3007
```

You can browse most screens without a key. AI features will prompt for a key when used.

### Prerequisites
- Node.js (v20+ recommended)
- Google Cloud / Gemini API Key
- **PostgreSQL** with **pgvector** extension enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/t012093/learning-platform-from-gemini.git
   cd learning-platform-from-gemini
   ```

2. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   VITE_GEMINI_API_KEY=your_api_key_here
   DATABASE_URL_PHASE1=postgres://user:password@localhost:5432/lumina_db
   ```
   - `GEMINI_API_KEY` is used by the backend.
   - `VITE_GEMINI_API_KEY` is used by the frontend (Vite exposes `VITE_` vars).
   - **Never commit** `.env.local` (already ignored).

3. **Database Setup**
   Initialize the PostgreSQL database schema and seed initial data.
   ```bash
   # 1. Create tables
   psql -d lumina_db -f doc/ai-curriculum-spec/local_postgres_phase1.sql
   
   # 2. Run migration (if needed) & Seed initial courses
   node scripts/migrate_curricula.js
   node scripts/seed_full_integrated.js
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Run Development Environment**
   This starts the frontend (Vite) and the backend (Express with LangGraph).
   ```bash
   npm run dev
   # Frontend: http://localhost:3007
   # Backend: http://localhost:3006
   ```

---

## 📂 Project Structure

```
/
├── components/          # React Components
│   ├── common/          # Shared UI (Layouts, Buttons, Modals)
│   ├── features/        # Feature-specific components
│       ├── ai/          # AI Course Generator, Chat, Character Views
│       ├── dashboard/   # Main Dashboard & Learning Hub
│       └── ...          # Other domain views
├── context/             # Global Contexts (Theme, etc.)
├── public/              # Static assets
├── server/              # Node.js Express Backend
│   ├── graph/           # LangGraph Multi-Agent Workflows
│   ├── geminiBackendService.js # AI Generation Logic
│   ├── ragService.js    # RAG Ingestion & Retrieval
│   └── jobWorker.js     # Async Job Queue Worker
├── scripts/             # Utility scripts (Seeding, Migrations)
├── services/            # Frontend API Clients
├── server.js            # Main Server Entry Point
└── types.ts             # Global TypeScript definitions
```

---

## 🚧 Current Development Focus & Roadmap

We have successfully migrated to a **LangGraph-based Multi-Agent Backend**.

### Completed Features
- **LangGraph Integration**: State-driven workflow for "Requirements -> Roadmap -> Curriculum" generation with user approval loops.
- **RAG Architecture**: Document ingestion (PDF/Txt), chunking with `RecursiveCharacterTextSplitter`, and vector search using `pgvector`.
- **Async Job Worker**: Scalable background processing for document embedding.
- **Real AI Generation**: Powered by **Gemini 2.0 Flash** via `@google/genai` SDK v1.x.
- **Database Persistence**: Full state synchronization with PostgreSQL.

### Active Issues
- **Issue #3**: **Gemini 2.5 TTS Implementation**
  - Goal: Replace `gTTS` with `@google/genai` SDK native audio generation.
- **Issue #4**: **Voice Selection Feature**
  - Goal: Allow users to select different voice personalities.

### How to Contribute
1. Check the [Issues](https://github.com/t012093/learning-platform-from-gemini/issues) tab.
2. Create a feature branch from `main` (example: `feat/your-topic`).
3. Keep commits scoped and descriptive.
4. Follow the project's coding style (Functional React components, TypeScript, Tailwind).

### Collaboration Tips
- **Keys & secrets**: Use `.env.local` or localStorage; never commit secrets.
- **Large files**: Avoid committing large binaries (PDFs, datasets) unless agreed.
- **Demo vs full stack**: UI-only is fine for quick reviews; full stack is needed for AI generation flows.

---

<div align="center">
  <sub>Built with ❤️ by the Lumina Team</sub>
</div>
