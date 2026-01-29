import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg'; // For legacy pool if needed, or remove
import { generateAudioContent } from './scripts/gemini_tts_node.js';
import { jobWorker } from './server/jobWorker.js';

// New Routes
import aiRoutes from './server/routes/ai.js';
import contentRoutes from './server/routes/content.js';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment ---
const loadEnvFile = async (filename) => {
    const envPath = path.join(__dirname, filename);
    try {
        const raw = await fs.readFile(envPath, 'utf8');
        raw.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
            const separatorIndex = normalized.indexOf('=');
            if (separatorIndex === -1) return;
            const key = normalized.slice(0, separatorIndex).trim();
            if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) return;
            let value = normalized.slice(separatorIndex + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        });
    } catch (error) {
        if (error?.code !== 'ENOENT') console.warn(`Failed to load ${filename}:`, error);
    }
};
await loadEnvFile('.env.local');

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3006;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Mount V2 Routes ---
app.use('/api/v2/ai', aiRoutes);
app.use('/api/v2', contentRoutes);

// --- Legacy / Other Routes (Keeping for compatibility) ---

// Audio Generation (could be moved to content.js but keeping here for simplicity)
app.post('/api/generate-audio', async (req, res) => {
    const courseData = req.body;
    const courseId = courseData.id;
    if (!courseId) return res.status(400).json({ error: 'Course ID is missing' });

    res.json({ message: 'Audio generation started (Gemini TTS)', courseId });
    console.log(`Starting Gemini TTS for course: ${courseId}`);

    // Background process
    (async () => {
        try {
            const baseDir = path.join(__dirname, 'public/data/audio', courseId);
            await fs.mkdir(baseDir, { recursive: true });
            const chapters = courseData.chapters || [];
            for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
                const slides = chapters[chIdx].slides || [];
                for (let sIdx = 0; sIdx < slides.length; sIdx++) {
                    const slide = slides[sIdx];
                    let text = slide.speechScript;
                    if (!text || text.trim().length === 0) {
                        const bullets = slide.bullets || [];
                        text = bullets.length > 0 ? bullets.join(". ") : slide.title;
                    }
                    if (!text) continue;
                    const filename = `${chIdx}_${sIdx}.mp3`;
                    const filepath = path.join(baseDir, filename);
                    try {
                        const audioBase64 = await generateAudioContent(text);
                        const audioBuffer = Buffer.from(audioBase64, 'base64');
                        await fs.writeFile(filepath, audioBuffer);
                    } catch (err) {
                        console.error(`Audio Error ${filename}:`, err);
                    }
                }
            }
            console.log(`Audio generation done for: ${courseId}`);
        } catch (error) {
            console.error(`Audio Fatal Error:`, error);
        }
    })();
});

// Legacy Learning Portals (Using Phase 1 Pool directly here for read compatibility)
// Note: Frontend mostly uses /api/v2 now, but LearningHub might still hit /api/learning-portals
// We can redirect or reimplement using db.js if needed.
// For now, let's include a minimal legacy handler using the shared pool.
import { getPool } from './server/db.js';

app.get('/api/learning-portals', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.json({ ok: true, portals: [] }); // Graceful fail
    try {
        const result = await pool.query(
            `SELECT id, title, subtitle, description, view_state, icon_key, color_class, bg_class, border_class, image_url, is_active, sort_order
             FROM learning_portals WHERE is_active = true ORDER BY sort_order ASC`
        );
        // Simple mapper
        const portals = result.rows.map(row => ({
            id: row.id,
            title: typeof row.title === 'string' ? JSON.parse(row.title) : row.title,
            subtitle: typeof row.subtitle === 'string' ? JSON.parse(row.subtitle) : row.subtitle,
            description: typeof row.description === 'string' ? JSON.parse(row.description) : row.description,
            view: row.view_state,
            icon: row.icon_key,
            color: row.color_class,
            bg: row.bg_class,
            borderColor: row.border_class,
            image: row.image_url,
            isActive: row.is_active,
            sortOrder: row.sort_order
        }));
        res.json({ ok: true, portals });
    } catch (e) {
        console.error("Legacy Portal Error", e);
        res.status(500).json({ error: "Legacy Error" });
    }
});

// --- Server Start ---
jobWorker.start();

app.listen(PORT, () => {
    console.log(`Lumina Server running on http://localhost:${PORT}`);
    console.log(`- V2 AI Routes: /api/v2/ai`);
    console.log(`- V2 Content Routes: /api/v2`);
});
