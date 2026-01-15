import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestMaterial } from '../ragService.js';
import { getPool, ensurePhase1User, PHASE1_USER_ID } from '../db.js';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../'); 

const router = express.Router();

// --- Configuration ---
const DEFAULT_COURSE_CARD = {
    category: 'AI Generated',
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&q=80&w=800',
    color: 'bg-indigo-500',
};

// --- Upload Setup ---
const uploadDir = path.join(PROJECT_ROOT, 'public/uploads');
(async () => {
    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true });
    }
})();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// --- Routes ---

// GET /api/v2/curricula
router.get('/curricula', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not configured' });

    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    try {
        await ensurePhase1User(pool);
        const result = await pool.query(
            `select id, title, description, current_version_id, created_at, category, thumbnail, color
             from curricula
             where user_id = $1
             order by created_at desc
             limit $2 offset $3`,
            [PHASE1_USER_ID, limit, offset]
        );
        res.json({ ok: true, curricula: result.rows });
    } catch (error) {
        console.error('List Error:', error);
        res.status(500).json({ error: 'Failed to load curricula' });
    }
});

// GET /api/v2/curricula/:id
router.get('/curricula/:id', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not configured' });

    try {
        const result = await pool.query(
            'SELECT content FROM curricula WHERE id = $1', // Legacy fallback? 
            // Wait, v2 uses curriculum_versions mostly.
            // But let's check what the old server.js did.
            // It did: `select id, title...` then `select content_json from curriculum_versions`
            // Replicating standard logic:
            [req.params.id]
        );
        
        // Better logic: Join
        const detailRes = await pool.query(`
            SELECT c.*, v.content_json, v.status
            FROM curricula c
            LEFT JOIN curriculum_versions v ON c.current_version_id = v.id
            WHERE c.id = $1
        `, [req.params.id]);

        if (detailRes.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        
        const row = detailRes.rows[0];
        res.json({
            ok: true,
            course: {
                ...row,
                content: row.content_json || row.content // Fallback to legacy content column
            }
        });
    } catch (error) {
        console.error('Detail Error:', error);
        res.status(500).json({ error: 'Failed to load curriculum' });
    }
});

// POST /api/v2/upload
router.post('/upload', upload.single('file'), async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not configured' });
    if (!req.file) return res.status(400).json({ error: 'No file' });

    try {
        await ensurePhase1User(pool);
        const type = req.file.mimetype.includes('pdf') ? 'pdf' : 
                     req.file.mimetype.includes('audio') ? 'audio' : 'txt';
        // Store relative path for portability
        const storagePath = `public/uploads/${req.file.filename}`;
        const absolutePath = path.join(PROJECT_ROOT, storagePath);

        const result = await pool.query(
            `insert into materials (user_id, type, title, storage_path, status)
             values ($1, $2, $3, $4, 'uploaded') returning id, status`,
            [PHASE1_USER_ID, type, req.file.originalname, storagePath]
        );
        const materialId = result.rows[0].id;

        // Trigger synchronous ingestion for immediate analysis availability
        console.log(`Starting immediate ingestion for material ${materialId}...`);
        try {
            await ingestMaterial(materialId, absolutePath, req.file.mimetype, PHASE1_USER_ID);
            res.json({ ok: true, material_id: materialId, status: 'ready' });
        } catch (ingestErr) {
            console.error('Immediate Ingestion failed, but file was uploaded:', ingestErr);
            // Fallback: still return success but status is 'uploaded'
            res.json({ ok: true, material_id: materialId, status: 'uploaded' });
        }
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// POST /api/v2/rag/index
router.post('/rag/index', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not configured' });
    
    const { material_id } = req.body;
    if (!material_id) return res.status(400).json({ error: 'material_id required' });

    try {
        await ensurePhase1User(pool);
        const result = await pool.query(
            `insert into jobs (user_id, type, status, payload)
             values ($1, 'ingest', 'queued', $2)
             returning id, status`,
            [PHASE1_USER_ID, JSON.stringify({ material_id })]
        );
        res.json({ job_id: result.rows[0].id, status: 'queued' });
    } catch (error) {
        console.error('Job Queue Error:', error);
        res.status(500).json({ error: 'Failed to queue job' });
    }
});

// GET /api/v2/jobs/:id
router.get('/jobs/:id', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not configured' });

    try {
        const result = await pool.query(
            'select status, progress, error from jobs where id = $1',
            [req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check job' });
    }
});

export default router;
