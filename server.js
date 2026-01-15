import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { generateAudioContent } from './scripts/gemini_tts_node.js';
import { generateRequirements, generateRoadmap, generateCurriculum } from './server/geminiBackendService.js';
import { ingestMaterial } from './server/ragService.js';
import { createCurriculumGraph } from './server/graph/workflow.js';
import { jobWorker } from './server/jobWorker.js';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'" ) && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        });
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            console.warn(`Failed to load ${filename}:`, error);
        }
    }
};

await loadEnvFile('.env.local');

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3006;
const { Pool } = pg;
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool();
const phase1DatabaseUrl = process.env.DATABASE_URL_PHASE1;
const phase1Pool = phase1DatabaseUrl ? new Pool({ connectionString: phase1DatabaseUrl }) : null;
const PHASE1_USER_ID = process.env.PHASE1_USER_ID || '00000000-0000-0000-0000-000000000001';

const curriculumGraph = createCurriculumGraph();

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

const requirePhase1Pool = (res) => {
    if (!phase1Pool) {
        res.status(503).json({
            ok: false,
            error: 'Phase1 database is not configured. Set DATABASE_URL_PHASE1.',
        });
        return null;
    }
    return phase1Pool;
};

const ensurePhase1User = async (poolInstance) => {
    await poolInstance.query(
        'insert into auth.users (id) values ($1) on conflict do nothing',
        [PHASE1_USER_ID]
    );
};

const normalizeStateJson = (state) => {
    if (!state || typeof state !== 'object') return {};
    return state;
};

const buildDraftSummary = (stage, message) => ({
    summary: typeof message === 'string' && message.trim().length
        ? message.trim()
        : `${stage} draft`,
});

const buildApprovalUi = (pendingApproval) => {
    if (!pendingApproval || pendingApproval === 'none') return null;
    return { type: 'approval', options: ['approved', 'revise'] };
};

const extractLevel = (message) => {
    const lower = (message || '').toLowerCase();
    if (lower.includes('beginner') || lower.includes('novice')) return 'beginner';
    if (lower.includes('intermediate')) return 'intermediate';
    if (lower.includes('advanced') || lower.includes('expert')) return 'advanced';
    return 'unspecified';
};

const normalizeTopic = (message) => {
    if (!message) return 'Custom Curriculum';
    const trimmed = message.replace(/\s+/g, ' ').trim();
    const firstSentence = trimmed.split(/[.!?\n]/)[0] || trimmed;
    const limited = firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence;
    return limited || 'Custom Curriculum';
};

const sanitizeTopic = (message) => {
    const base = normalizeTopic(message);
    let topic = base;
    topic = topic.replace(/^(learn|study|master|understand|build|create|intro(?:duction)? to|how to)\s+/i, '');
    topic = topic.replace(/\bfor (a |an )?(beginner|intermediate|advanced|expert)\b/gi, ' ');
    topic = topic.replace(/\b(beginner|intermediate|advanced|expert)\b/gi, ' ');
    topic = topic.replace(/(初心者|初学者|ビギナー|中級|上級|エキスパート|入門)/g, ' ');
    topic = topic.replace(/の?ための/g, ' ');
    topic = topic.replace(/\s+/g, ' ').trim();
    return topic || 'Custom Curriculum';
};

const buildSummaryLabel = (topic, level) => {
    if (!level || level === 'unspecified') return `Learn ${topic}`;
    return `Learn ${topic} (${level})`;
};

const moduleTitleFor = (topic, label) => {
    if (!topic) return label;
    const short = topic.length > 42 ? `${topic.slice(0, 39)}...` : topic;
    return `${short} ${label}`;
};

const hoursByLevel = (level) => {
    if (level === 'advanced') return [4, 6, 5];
    if (level === 'intermediate') return [4, 5, 4];
    if (level === 'beginner') return [3, 4, 3];
    return [3, 4, 3];
};

const buildRequirementsDraft = (message, attachments) => {
    const level = extractLevel(message);
    const topic = sanitizeTopic(message);
    return {
        summary: buildSummaryLabel(topic, level),
        goal: topic,
        level,
        constraints: [],
        success_criteria: ['Complete module exercises', 'Pass the final quiz'],
        materials: attachments || [],
    };
};

const buildRoadmapDraft = (requirements) => {
    const topic = requirements?.goal || 'Your Topic';
    const level = requirements?.level || 'unspecified';
    const [h1, h2, h3] = hoursByLevel(level);
    const modules = [
        {
            module_id: 'm1',
            title: moduleTitleFor(topic, 'Foundations'),
            objective: 'Understand core concepts and vocabulary.',
            estimated_hours: h1,
        },
        {
            module_id: 'm2',
            title: moduleTitleFor(topic, 'Practice'),
            objective: 'Apply the fundamentals through guided practice.',
            estimated_hours: h2,
        },
        {
            module_id: 'm3',
            title: moduleTitleFor(topic, 'Capstone'),
            objective: 'Ship a small project or final assessment.',
            estimated_hours: h3,
        },
    ];
    return {
        title: `${topic} Roadmap`,
        overview: `A three-step path to build confidence with ${topic}.`,
        modules,
        total_hours: modules.reduce((sum, module) => sum + (module.estimated_hours || 0), 0),
    };
};

const buildLesson = (moduleId, index, topic, lessonTitle, focus) => {
    const lessonId = `${moduleId}-l${index + 1}`;
    const summary = `${lessonTitle} for ${topic}`;
    return {
        lesson_id: lessonId,
        summary,
        estimated_min: 20,
        unlock_rule: 'doc_completed',
        retry_policy: 'review_then_retry',
        doc_blocks: [
            { type: 'text', content: `${summary}.` },
            {
                type: 'bullets',
                items: [
                    `Key idea: ${focus}`,
                    'Practice with a short hands-on task.',
                    'Capture what you learned.',
                ],
            },
        ],
        exercises: [
            {
                prompt: `Write a short note explaining ${focus} in your own words.`,
                expected: 'A concise explanation that shows understanding.',
            },
        ],
        quiz: [
            {
                q: `What is the main goal of ${focus}?`,
                choices: ['Recall the definition', 'Apply it in context', 'Ignore it'],
                answer: 1,
            },
        ],
        ui_hints: {
            card_title: lessonTitle,
            card_text: `${focus} essentials`,
            cta: 'Start lesson',
            difficulty: 'easy',
            time: '20m',
            tags: [topic],
        },
    };
};

const buildCurriculumDraft = (requirements, roadmap, options) => {
    const topic = requirements?.goal || 'Custom Curriculum';
    const modules = (roadmap?.modules || []).map((module, index) => {
        const moduleId = module.module_id || `m${index + 1}`;
        const lessons = [
            buildLesson(moduleId, 0, topic, 'Core Concepts', module.objective || 'Core concepts'),
            buildLesson(moduleId, 1, topic, 'Practice Lab', 'Hands-on practice'),
        ];
        return {
            module_id: moduleId,
            title: module.title || `Module ${index + 1}`,
            objective: module.objective || 'Build foundational knowledge.',
            prereq_modules: index > 0 ? [`m${index}`] : [],
            estimated_hours: module.estimated_hours || 3,
            deliverable: `Complete ${module.title || `Module ${index + 1}`}`,
            assessment: index === (roadmap?.modules?.length || 1) - 1 ? 'project' : 'quiz',
            module_ui_hints: {
                card_title: module.title || `Module ${index + 1}`,
                card_text: module.objective || 'Build foundational knowledge.',
                tags: [topic],
                difficulty: index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard',
            },
            lessons,
        };
    });

    return {
        curriculum_id: options?.curriculumId,
        version: options?.version || 1,
        ui_template_id: 'vibe_coding',
        title: { jp: `${topic} Course`, en: `${topic} Course` },
        description: { jp: `A guided path to master ${topic}.`, en: `A guided path to master ${topic}.` },
        content_mix: { doc: 0.4, chat: 0.1, exercise: 0.3, quiz: 0.2, project: 0.0 },
        assessment_mix: { quiz: 0.5, project: 0.2, reflection: 0.2, oral: 0.1 },
        modules,
    };
};

const fetchLatestCurriculumVersion = async (poolInstance, curriculumId) => {
    const result = await poolInstance.query(
        `select id, version, content_json, status, requirements, roadmap, content_mix, assessment_mix
         from curriculum_versions
         where curriculum_id = $1
         order by version desc
         limit 1`,
        [curriculumId]
    );
    return result.rows[0] || null;
};

const fetchCurriculumVersion = async (poolInstance, curriculumVersionId) => {
    const result = await poolInstance.query(
        `select id, version, content_json, status, requirements, roadmap, content_mix, assessment_mix
         from curriculum_versions
         where id = $1`,
        [curriculumVersionId]
    );
    return result.rows[0] || null;
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

// Phase1 API (separate database, non-destructive to existing flows)
// Integrated with LangGraph for multi-agent workflow
app.post('/api/v2/ai/chat', async (req, res) => {
    const poolInstance = requirePhase1Pool(res);
    if (!poolInstance) return;

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : '';
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];

    try {
        await ensurePhase1User(poolInstance);

        let session = null;
        if (sessionId) {
            const result = await poolInstance.query(
                'select * from ai_sessions where id = $1 and user_id = $2',
                [sessionId, PHASE1_USER_ID]
            );
            session = result.rows[0] || null;
        }

        if (!session) {
            // Create new curriculum and version container
            const curriculumResult = await poolInstance.query(
                'insert into curricula (user_id, title, description) values ($1, $2, $3) returning id',
                [PHASE1_USER_ID, 'New Curriculum', '']
            );
            const curriculumId = curriculumResult.rows[0].id;
            const versionResult = await poolInstance.query(
                'insert into curriculum_versions (curriculum_id, version, requirements, content_json) values ($1, $2, $3, $4) returning id',
                [curriculumId, 1, JSON.stringify({}), JSON.stringify({})]
            );
            const versionId = versionResult.rows[0].id;
            
            // Initial state for graph
            const initialState = {
                user_id: PHASE1_USER_ID,
                curriculum_id: curriculumId,
                curriculum_version_id: versionId,
                requirements: {}, roadmap: {}, curriculum: {},
                pending_approval: 'none',
                last_user_message: message,
                attachments: attachments
            };

            const sessionResult = await poolInstance.query(
                'insert into ai_sessions (user_id, curriculum_id, state_json, pending_approval, last_message_at) values ($1, $2, $3, $4, now()) returning *',
                [PHASE1_USER_ID, curriculumId, JSON.stringify(initialState), 'none']
            );
            session = sessionResult.rows[0];
        }

        // Prepare input for graph
        const currentState = normalizeStateJson(session.state_json);
        const inputState = {
            ...currentState,
            last_user_message: message,
            attachments: attachments,
            current_decision: null
        };
        
        // Run Graph
        const outputState = await curriculumGraph.invoke(inputState);
        
        // Update Session & DB
        const nextPending = outputState.pending_approval || 'none';
        
        await poolInstance.query(
            'update ai_sessions set state_json = $1, pending_approval = $2, state_version = state_version + 1, last_message_at = now() where id = $3',
            [JSON.stringify(outputState), nextPending, session.id]
        );

        // Sync to relational tables
        const versionId = outputState.curriculum_version_id;
        if (versionId) {
             const updates = [];
             const values = [];
             let idx = 1;
             
             if (outputState.requirements?.draft || outputState.requirements?.approved) {
                 updates.push(`requirements = $${idx++}`);
                 values.push(JSON.stringify(outputState.requirements.approved || outputState.requirements.draft));
                 
                 const summary = (outputState.requirements.approved || outputState.requirements.draft)?.summary;
                 if (summary) {
                     await poolInstance.query('update curricula set title = $1 where id = $2', [summary, outputState.curriculum_id]);
                 }
             }
             if (outputState.roadmap?.draft || outputState.roadmap?.approved) {
                 updates.push(`roadmap = $${idx++}`);
                 values.push(JSON.stringify(outputState.roadmap.approved || outputState.roadmap.draft));
             }
             if (outputState.curriculum?.draft || outputState.curriculum?.approved) {
                 updates.push(`content_json = $${idx++}`);
                 values.push(JSON.stringify(outputState.curriculum.approved || outputState.curriculum.draft));
             }
             
             if (updates.length > 0) {
                 values.push(versionId);
                 await poolInstance.query(
                     `update curriculum_versions set ${updates.join(', ')}, updated_at = now() where id = $${idx}`,
                     values
                 );
             }
        }

        res.json({
            session_id: session.id,
            curriculum_id: outputState.curriculum_id || session.curriculum_id,
            curriculum_version_id: outputState.curriculum_version_id,
            message: nextPending === 'none' ? 'Session active.' : `${nextPending} draft ready.`,
            pending_approval: nextPending,
            ui: buildApprovalUi(nextPending),
            state_summary: {
                requirements: outputState.requirements || {},
                roadmap: outputState.roadmap || {},
                curriculum: outputState.curriculum || {},
            },
        });
    } catch (error) {
        console.error('Phase1 chat failed:', error);
        res.status(500).json({ ok: false, error: 'Phase1 chat failed.' });
    }
});

app.get('/api/v2/curricula', async (req, res) => {
    const poolInstance = requirePhase1Pool(res);
    if (!poolInstance) return;

    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    try {
        await ensurePhase1User(poolInstance);
        const result = await poolInstance.query(
            `select id, title, description, current_version_id, created_at
             from curricula
             where user_id = $1
             order by created_at desc
             limit $2 offset $3`,
            [PHASE1_USER_ID, limit, offset]
        );
        res.json({ ok: true, curricula: result.rows });
    } catch (error) {
        console.error('Failed to load Phase1 curricula:', error);
        res.status(500).json({ ok: false, error: 'Failed to load Phase1 curricula.' });
    }
});

app.get('/api/v2/curricula/:id', async (req, res) => {
    const poolInstance = requirePhase1Pool(res);
    if (!poolInstance) return;

    const { id } = req.params;

    try {
        await ensurePhase1User(poolInstance);
        const curriculumResult = await poolInstance.query(
            `select id, title, description, current_version_id
             from curricula
             where id = $1 and user_id = $2`,
            [id, PHASE1_USER_ID]
        );
        if (!curriculumResult.rowCount) {
            return res.status(404).json({ ok: false, error: 'Curriculum not found.' });
        }

        const curriculum = curriculumResult.rows[0];
        let version = null;
        if (curriculum.current_version_id) {
            const versionResult = await poolInstance.query(
                'select id, content_json, status from curriculum_versions where id = $1',
                [curriculum.current_version_id]
            );
            version = versionResult.rows[0] || null;
        }
        if (!version) {
            version = await fetchLatestCurriculumVersion(poolInstance, curriculum.id);
        }

        res.json({
            ok: true,
            curriculum,
            curriculum_version_id: version?.id || null,
            status: version?.status || null,
            course: version?.content_json || {},
            requirements: version?.requirements || null,
            roadmap: version?.roadmap || null,
            content_mix: version?.content_mix || null,
            assessment_mix: version?.assessment_mix || null,
        });
    } catch (error) {
        console.error('Failed to load Phase1 curriculum:', error);
        res.status(500).json({ ok: false, error: 'Failed to load Phase1 curriculum.' });
    }
});

app.post('/api/v2/curricula/:id/decision', async (req, res) => {
    const poolInstance = requirePhase1Pool(res);
    if (!poolInstance) return;

    const stage = typeof req.body?.stage === 'string' ? req.body.stage : '';
    const decision = typeof req.body?.decision === 'string' ? req.body.decision : '';
    const feedbackText = typeof req.body?.feedback_text === 'string' ? req.body.feedback_text : null;
    const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id : '';

    if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });

    try {
        await ensurePhase1User(poolInstance);
        
        const sessionResult = await poolInstance.query(
            'select * from ai_sessions where id = $1 and user_id = $2',
            [sessionId, PHASE1_USER_ID]
        );
        if (!sessionResult.rowCount) return res.status(404).json({ ok: false, error: 'Session not found' });
        const session = sessionResult.rows[0];

        const currentState = normalizeStateJson(session.state_json);
        const inputState = {
            ...currentState,
            current_decision: { stage, decision, feedback: feedbackText },
            last_user_message: null
        };

        const outputState = await curriculumGraph.invoke(inputState);

        const nextPending = outputState.pending_approval || 'none';
        const sessionStatus = stage === 'curriculum' && decision === 'approved' ? 'closed' : session.status;

        await poolInstance.query(
            'update ai_sessions set state_json = $1, pending_approval = $2, state_version = state_version + 1, status = $3, last_message_at = now() where id = $4',
            [JSON.stringify(outputState), nextPending, sessionStatus, session.id]
        );

        const versionId = outputState.curriculum_version_id;
        if (versionId) {
             const updates = [];
             const values = [];
             let idx = 1;
             
             if (outputState.requirements?.draft || outputState.requirements?.approved) {
                 updates.push(`requirements = $${idx++}`);
                 values.push(JSON.stringify(outputState.requirements.approved || outputState.requirements.draft));
             }
             if (outputState.roadmap?.draft || outputState.roadmap?.approved) {
                 updates.push(`roadmap = $${idx++}`);
                 values.push(JSON.stringify(outputState.roadmap.approved || outputState.roadmap.draft));
             }
             if (outputState.curriculum?.draft || outputState.curriculum?.approved) {
                 updates.push(`content_json = $${idx++}`);
                 values.push(JSON.stringify(outputState.curriculum.approved || outputState.curriculum.draft));
             }
             if (stage === 'curriculum' && decision === 'approved') {
                 updates.push(`status = $${idx++}`);
                 values.push('approved');
                 await poolInstance.query('update curricula set current_version_id = $1 where id = $2', [versionId, outputState.curriculum_id]);
             }

             if (updates.length > 0) {
                 values.push(versionId);
                 await poolInstance.query(
                     `update curriculum_versions set ${updates.join(', ')}, updated_at = now() where id = $${idx}`,
                     values
                 );
             }
        }
        
        await poolInstance.query(
            `insert into approvals (curriculum_version_id, stage, decision, feedback_text, decided_by) values ($1, $2, $3, $4, $5)`,
            [versionId, stage, decision, feedbackText, PHASE1_USER_ID]
        );

        res.json({
            ok: true,
            curriculum_version_id: versionId,
            status: sessionStatus === 'closed' ? 'approved' : 'draft',
            pending_approval: nextPending,
            state_summary: {
                requirements: outputState.requirements || {},
                roadmap: outputState.roadmap || {},
                curriculum: outputState.curriculum || {},
            },
        });

    } catch (error) {
        console.error('Decision failed:', error);
        res.status(500).json({ ok: false, error: 'Decision failed' });
    }
});

app.post('/api/v2/materials', async (req, res) => {
    const poolInstance = requirePhase1Pool(res);
    if (!poolInstance) return;

    const type = typeof req.body?.type === 'string' ? req.body.type : '';
    const title = typeof req.body?.title === 'string' ? req.body.title : null;
    const sourceUrl = typeof req.body?.source_url === 'string' ? req.body.source_url : null;
    const storagePath = typeof req.body?.storage_path === 'string' ? req.body.storage_path : null;

    const allowedTypes = new Set(['pdf', 'audio', 'youtube', 'txt', 'db']);
    if (!allowedTypes.has(type)) {
        return res.status(400).json({ ok: false, error: 'Invalid material type.' });
    }
    if (!storagePath && !sourceUrl) {
        return res.status(400).json({ ok: false, error: 'storage_path or source_url is required.' });
    }

    try {
        await ensurePhase1User(poolInstance);
        const result = await poolInstance.query(
            `insert into materials
                (user_id, type, title, source_url, storage_path, status)
             values ($1, $2, $3, $4, $5, 'uploaded')
             returning id, status`,
            [PHASE1_USER_ID, type, title, sourceUrl, storagePath]
        );
        res.json({ material_id: result.rows[0].id, status: result.rows[0].status });
    } catch (error) {
        console.error('Failed to create Phase1 material:', error);
        res.status(500).json({ ok: false, error: 'Failed to create Phase1 material.' });
    }
});

app.post('/api/v2/rag/index', async (req, res) => {
    const poolInstance = requirePhase1Pool(res);
    if (!poolInstance) return;

    const materialId = typeof req.body?.material_id === 'string' ? req.body.material_id : '';
    if (!materialId) {
        return res.status(400).json({ ok: false, error: 'material_id is required.' });
    }

    try {
        await ensurePhase1User(poolInstance);
        
        // Fetch material details
        const matResult = await poolInstance.query(
            'SELECT * FROM materials WHERE id = $1 AND user_id = $2',
            [materialId, PHASE1_USER_ID]
        );
        if (!matResult.rowCount) {
            return res.status(404).json({ ok: false, error: 'Material not found.' });
        }
        const material = matResult.rows[0];

        const result = await poolInstance.query(
            `insert into jobs (user_id, type, status, payload)
             values ($1, 'ingest', 'queued', $2)
             returning id, status`,
            [PHASE1_USER_ID, JSON.stringify({ material_id: materialId })]
        );
        const jobId = result.rows[0].id;
        
        // Job picked up by worker asynchronously
        res.json({ job_id: jobId, status: 'queued' });
    } catch (error) {
        console.error('Failed to queue Phase1 job:', error);
        res.status(500).json({ ok: false, error: 'Failed to queue Phase1 job.' });
    }
});

app.get('/api/v2/jobs/:id', async (req, res) => {
    const poolInstance = requirePhase1Pool(res);
    if (!poolInstance) return;

    const { id } = req.params;
    try {
        await ensurePhase1User(poolInstance);
        const result = await poolInstance.query(
            `select status, progress, error, result_ref
             from jobs
             where id = $1 and user_id = $2`,
            [id, PHASE1_USER_ID]
        );
        if (!result.rowCount) {
            return res.status(404).json({ ok: false, error: 'Job not found.' });
        }
        res.json({
            status: result.rows[0].status,
            progress: result.rows[0].progress,
            error: result.rows[0].error || null,
            result_ref: result.rows[0].result_ref || null,
        });
    } catch (error) {
        console.error('Failed to load Phase1 job:', error);
        res.status(500).json({ ok: false, error: 'Failed to load Phase1 job.' });
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

jobWorker.start();

app.listen(PORT, () => {
    console.log(`Audio Generation Server (Gemini TTS) running on http://localhost:${PORT}`);
});