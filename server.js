import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { generateAudioContent } from './scripts/gemini_tts_node.js';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3006;
const { Pool } = pg;
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool();

const DEFAULT_COURSE_CARD = {
    category: 'AI Generated',
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&q=80&w=800',
    color: 'bg-indigo-500',
};
const DEFAULT_PORTAL_STYLE = {
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    borderColor: 'border-slate-200',
};
const VIEW_STATE_ALIASES = {
    PROGRAMMING_WEB: 'programming_web',
    PROGRAMMING_AI: 'programming_ai',
    PROGRAMMING_VIBE: 'programming_vibe',
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/debug/log-course', async (req, res) => {
    console.log("======== DEBUG: RECEIVED COURSE DATA ========");
    try {
        await fs.writeFile('curriculum_debug.json', JSON.stringify(req.body, null, 2));
        console.log("Saved to curriculum_debug.json");
    } catch (e) {
        console.error("Failed to save debug log:", e);
    }
    res.sendStatus(200);
});

const teacherBotStore = {
    sessions: new Map(),
    lastEvent: null,
};

const normalizeCourseInput = (payload) => {
    const course = payload?.course || payload;
    if (!course || typeof course !== 'object') return null;
    const id = typeof course.id === 'string' ? course.id.trim() : '';
    const title = typeof course.title === 'string' ? course.title.trim() : '';
    if (!id || !title) return null;

    const description = typeof course.description === 'string' ? course.description : '';
    const duration = typeof course.duration === 'string' ? course.duration : '';
    const chapters = Array.isArray(course.chapters) ? course.chapters : [];

    return {
        id,
        title,
        description,
        duration,
        totalLessons: chapters.length,
        modelUsed: typeof course.modelUsed === 'string' ? course.modelUsed : null,
        content: course,
    };
};

const mapRowToCourseCard = (row) => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || DEFAULT_COURSE_CARD.category,
    progress: 0,
    totalLessons: row.total_lessons || 0,
    completedLessons: 0,
    thumbnail: row.thumbnail || DEFAULT_COURSE_CARD.thumbnail,
    color: row.color || DEFAULT_COURSE_CARD.color,
    source: 'generated',
});

const parseJsonField = (value) => {
    if (!value) return { en: '', jp: '' };
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return { en: '', jp: '' };
    try {
        return JSON.parse(value);
    } catch (error) {
        return { en: '', jp: '' };
    }
};

const normalizeViewState = (value) => {
    if (!value) return value;
    return VIEW_STATE_ALIASES[value] || value;
};

const mapRowToLearningPortal = (row) => ({
    id: row.id,
    title: parseJsonField(row.title),
    subtitle: parseJsonField(row.subtitle),
    description: parseJsonField(row.description),
    view: normalizeViewState(row.view_state),
    icon: row.icon_key,
    color: row.color_class || DEFAULT_PORTAL_STYLE.color,
    bg: row.bg_class || DEFAULT_PORTAL_STYLE.bg,
    borderColor: row.border_class || DEFAULT_PORTAL_STYLE.borderColor,
    image: row.image_url || '',
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
});

const normalizeEvent = (event) => {
    const now = Date.now() / 1000;
    return {
        schema_version: event.schema_version || '0.1',
        event_id: event.event_id || `${now}-${Math.random().toString(16).slice(2)}`,
        event: event.event || 'unknown',
        timestamp: event.timestamp || now,
        session_id: event.session_id || '',
        tour: event.tour || {},
        step: event.step || {},
        user: event.user || {},
        state: event.state || {},
        extra: event.extra || {},
        client: event.client || {},
    };
};

const storeEvent = (event) => {
    const sessionId =
        event.session_id ||
        event.user?.id ||
        event.user?.course ||
        'default';
    const current = teacherBotStore.sessions.get(sessionId) || {
        session_id: sessionId,
        events: [],
        last_event: null,
        updated_at: null,
    };
    current.events.push(event);
    if (current.events.length > 50) {
        current.events.shift();
    }
    current.last_event = event;
    current.updated_at = Date.now();
    teacherBotStore.sessions.set(sessionId, current);
    teacherBotStore.lastEvent = event;
    return current;
};

app.post('/api/teacher-bot/events', (req, res) => {
    const incoming = req.body;
    if (!incoming || !incoming.event) {
        return res.status(400).json({ error: 'Invalid payload' });
    }
    const normalized = normalizeEvent(incoming);
    const session = storeEvent(normalized);
    res.json({ ok: true, session_id: session.session_id });
});

app.get('/api/teacher-bot/state', (req, res) => {
    const sessionId = req.query.session_id;
    let payload;
    if (sessionId && teacherBotStore.sessions.has(sessionId)) {
        payload = teacherBotStore.sessions.get(sessionId);
    } else if (teacherBotStore.lastEvent) {
        const fallbackId = teacherBotStore.lastEvent.session_id || 'default';
        payload = teacherBotStore.sessions.get(fallbackId) || {
            session_id: fallbackId,
            events: [teacherBotStore.lastEvent],
            last_event: teacherBotStore.lastEvent,
            updated_at: Date.now(),
        };
    }
    if (!payload) {
        return res.json({ ok: false, message: 'No events yet' });
    }
    res.json({ ok: true, ...payload });
});

app.get('/api/learning-portals', async (req, res) => {
    try {
        const includeInactive = req.query.include_inactive === 'true' || req.query.include_inactive === '1';
        const whereClause = includeInactive ? '' : 'WHERE is_active = true';
        const result = await pool.query(
            `SELECT id, title, subtitle, description, view_state, icon_key, color_class, bg_class, border_class, image_url, is_active, sort_order
             FROM learning_portals
             ${whereClause}
             ORDER BY sort_order ASC, created_at DESC`
        );
        const portals = result.rows.map(mapRowToLearningPortal);
        res.json({ ok: true, portals });
    } catch (error) {
        console.error('Failed to load learning portals:', error);
        res.status(500).json({ ok: false, error: 'Failed to load learning portals.' });
    }
});

app.patch('/api/learning-portals/order', async (req, res) => {
    const updates = Array.isArray(req.body?.order) ? req.body.order : [];
    if (!updates.length) {
        return res.status(400).json({ ok: false, error: 'Order payload is required.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        for (const item of updates) {
            if (!item || typeof item.id !== 'string') {
                throw new Error('Invalid order payload.');
            }
            const orderValue = Number(item.sort_order);
            if (!Number.isFinite(orderValue)) {
                throw new Error('Invalid sort_order value.');
            }
            await client.query(
                'UPDATE learning_portals SET sort_order = $2, updated_at = NOW() WHERE id = $1',
                [item.id, orderValue]
            );
        }
        await client.query('COMMIT');
        res.json({ ok: true });
    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        }
        console.error('Failed to reorder learning portals:', error);
        res.status(500).json({ ok: false, error: 'Failed to reorder learning portals.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.patch('/api/learning-portals/:id', async (req, res) => {
    const { id } = req.params;
    const isActiveRaw = req.body?.is_active;
    const sortOrderRaw = req.body?.sort_order;
    const isActive = typeof isActiveRaw === 'boolean' ? isActiveRaw : null;
    const sortOrder = Number.isFinite(Number(sortOrderRaw)) ? Number(sortOrderRaw) : null;

    if (isActive === null && sortOrder === null) {
        return res.status(400).json({ ok: false, error: 'No valid fields provided.' });
    }

    try {
        const result = await pool.query(
            `UPDATE learning_portals
             SET is_active = COALESCE($2, is_active),
                 sort_order = COALESCE($3, sort_order),
                 updated_at = NOW()
             WHERE id = $1
             RETURNING id, is_active, sort_order`,
            [id, isActive, sortOrder]
        );
        if (!result.rowCount) {
            return res.status(404).json({ ok: false, error: 'Learning portal not found.' });
        }
        res.json({ ok: true, portal: result.rows[0] });
    } catch (error) {
        console.error('Failed to update learning portal:', error);
        res.status(500).json({ ok: false, error: 'Failed to update learning portal.' });
    }
});

app.get('/api/curricula', async (req, res) => {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    try {
        const result = await pool.query(
            `SELECT id, title, description, duration, total_lessons, category, thumbnail, color, created_at
             FROM curricula
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        const courses = result.rows.map(mapRowToCourseCard);
        res.json({ ok: true, courses });
    } catch (error) {
        console.error('Failed to load curricula:', error);
        res.status(500).json({ ok: false, error: 'Failed to load curricula.' });
    }
});

app.get('/api/curricula/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT content FROM curricula WHERE id = $1', [id]);
        if (!result.rowCount) {
            return res.status(404).json({ ok: false, error: 'Curriculum not found.' });
        }
        const content = result.rows[0]?.content;
        if (!content || typeof content !== 'object') {
            return res.status(500).json({ ok: false, error: 'Invalid curriculum data.' });
        }
        const course = { ...content, id: content.id || id };
        res.json({ ok: true, course });
    } catch (error) {
        console.error('Failed to load curriculum:', error);
        res.status(500).json({ ok: false, error: 'Failed to load curriculum.' });
    }
});

app.post('/api/curricula', async (req, res) => {
    const normalized = normalizeCourseInput(req.body);
    if (!normalized) {
        return res.status(400).json({ ok: false, error: 'Invalid course payload.' });
    }

    const payload = normalized.content;
    const category = typeof payload.category === 'string' && payload.category.trim().length > 0
        ? payload.category
        : DEFAULT_COURSE_CARD.category;
    const thumbnail = typeof payload.thumbnail === 'string' && payload.thumbnail.trim().length > 0
        ? payload.thumbnail
        : DEFAULT_COURSE_CARD.thumbnail;
    const color = typeof payload.color === 'string' && payload.color.trim().length > 0
        ? payload.color
        : DEFAULT_COURSE_CARD.color;

    try {
        await pool.query(
            `INSERT INTO curricula
                (id, title, description, duration, total_lessons, category, thumbnail, color, model_used, content, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
             ON CONFLICT (id)
             DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                duration = EXCLUDED.duration,
                total_lessons = EXCLUDED.total_lessons,
                category = EXCLUDED.category,
                thumbnail = EXCLUDED.thumbnail,
                color = EXCLUDED.color,
                model_used = EXCLUDED.model_used,
                content = EXCLUDED.content,
                updated_at = NOW()`,
            [
                normalized.id,
                normalized.title,
                normalized.description,
                normalized.duration,
                normalized.totalLessons,
                category,
                thumbnail,
                color,
                normalized.modelUsed,
                JSON.stringify(payload),
            ]
        );

        res.json({ ok: true, id: normalized.id });
    } catch (error) {
        console.error('Failed to save curriculum:', error);
        res.status(500).json({ ok: false, error: 'Failed to save curriculum.' });
    }
});

// エンドポイント: 音声生成を開始
app.post('/api/generate-audio', async (req, res) => {
    const courseData = req.body;
    const courseId = courseData.id;

    if (!courseId) {
        return res.status(400).json({ error: 'Course ID is missing' });
    }

    // クライアントには「受け付けた」ことを即座に返す（バックグラウンドで処理）
    res.json({ message: 'Audio generation started (Gemini TTS)', courseId });

    console.log(`Starting Gemini TTS audio generation for course: ${courseId}`);

    // バックグラウンドで処理を実行
    (async () => {
        try {
            // 保存先: public/data/audio/{courseId}
            const baseDir = path.join(__dirname, 'public/data/audio', courseId);
            await fs.mkdir(baseDir, { recursive: true });

            const chapters = courseData.chapters || [];
            
            // 各チャプター、各スライドをループ
            for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
                const slides = chapters[chIdx].slides || [];
                for (let sIdx = 0; sIdx < slides.length; sIdx++) {
                    const slide = slides[sIdx];
                    
                    // 優先順位: speechScript > bullets結合 > title
                    let text = slide.speechScript;
                    if (!text || text.trim().length === 0) {
                        const bullets = slide.bullets || [];
                        text = bullets.length > 0 ? bullets.join(". ") : slide.title;
                    }

                    if (!text) continue;

                    const filename = `${chIdx}_${sIdx}.mp3`;
                    const filepath = path.join(baseDir, filename);

                    console.log(`  Generating: [Chapter ${chIdx+1}, Slide ${sIdx+1}] -> ${filename}`);

                    try {
                        const audioBase64 = await generateAudioContent(text);
                        const audioBuffer = Buffer.from(audioBase64, 'base64');
                        await fs.writeFile(filepath, audioBuffer);
                    } catch (err) {
                        console.error(`    Error generating ${filename}:`, err);
                    }
                }
            }
            console.log(`Done! All narrations generated for course: ${courseId}`);
        } catch (error) {
            console.error(`Fatal error in audio generation loop:`, error);
        }
    })();
});

app.listen(PORT, () => {
    console.log(`Audio Generation Server (Gemini TTS) running on http://localhost:${PORT}`);
});
