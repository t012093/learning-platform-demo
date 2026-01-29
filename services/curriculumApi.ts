import { Course, GeneratedCourse } from '../types';
import { isVibeCodingCurriculum, mapVibeCodingToGeneratedCourse } from './vibeCodingAdapter';

const API_BASE = '/api/v2';
const USE_DEMO_MODE = true; // Toggle this for demo animation

type CurriculumListResponse = {
  ok: boolean;
  curricula?: any[];
  error?: string;
};

type CurriculumDetailResponse = {
  ok: boolean;
  curriculum?: any;
  course?: any; // content_json
  error?: string;
};

// --- DEMO DATA ---
const DEMO_CURRICULUM_ID = 'demo-curr-001';
const DEMO_SESSION_ID = 'demo-sess-001';

const DEMO_COURSE_DATA: GeneratedCourse = {
  id: DEMO_CURRICULUM_ID,
  title: 'Python for AI Development',
  description: 'A comprehensive guide to mastering Python for Artificial Intelligence, covering basics to advanced neural networks.',
  modules: [
    {
      title: { en: 'Python Basics', jp: 'Pythonの基礎' },
      lessons: [
        { title: { en: 'Variables and Types', jp: '変数とデータ型' }, reading_time: { en: '10 min', jp: '10分' }, type: 'text' },
        { title: { en: 'Control Flow', jp: '制御構文' }, reading_time: { en: '15 min', jp: '15分' }, type: 'text' }
      ]
    },
    {
      title: { en: 'Data Science Libraries', jp: 'データサイエンスライブラリ' },
      lessons: [
        { title: { en: 'NumPy Essentials', jp: 'NumPyの基本' }, reading_time: { en: '20 min', jp: '20分' }, type: 'text' },
        { title: { en: 'Pandas for Data Analysis', jp: 'Pandasでのデータ分析' }, reading_time: { en: '25 min', jp: '25分' }, type: 'text' }
      ]
    },
    {
      title: { en: 'Machine Learning', jp: '機械学習' },
      lessons: [
        { title: { en: 'Scikit-Learn Basics', jp: 'Scikit-Learnの基礎' }, reading_time: { en: '30 min', jp: '30分' }, type: 'text' },
        { title: { en: 'Neural Networks Intro', jp: 'ニューラルネットワーク入門' }, reading_time: { en: '35 min', jp: '35分' }, type: 'text' }
      ]
    }
  ],
  chapters: [], // Filled by normalization
  ui_template_id: 'doc_chapter',
  createdAt: new Date(),
  duration: '10 hours',
  modelUsed: 'gemini-2.5-flash',
  preferredTemplate: 'doc_chapter'
};

const normalizeGeneratedCourse = (raw: any): GeneratedCourse => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid curriculum payload.');
  }

  // If it's already a flat GeneratedCourse, return it
  if (raw.chapters && raw.ui_template_id) return raw as GeneratedCourse;

  // Handle DB record structure (v2)
  // API returns: { course: { content: { modules, ui_template_id }, ... } }
  // We need to check raw.course.content for the actual curriculum structure
  const courseData = raw.course || raw.content_json || raw;

  // The actual curriculum content might be nested in courseData.content
  const curriculumContent = courseData.content || courseData;

  // Debug: log what we're working with
  console.log('[curriculumApi] normalizeGeneratedCourse:', {
    hasRawCourse: !!raw.course,
    hasCourseContent: !!courseData.content,
    curriculumKeys: Object.keys(curriculumContent || {}),
    uiTemplateId: curriculumContent?.ui_template_id,
    hasModules: Array.isArray(curriculumContent?.modules),
    modulesCount: curriculumContent?.modules?.length,
    firstModuleLessonsCount: curriculumContent?.modules?.[0]?.lessons?.length,
    firstLessonHasSections: !!curriculumContent?.modules?.[0]?.lessons?.[0]?.sections
  });

  // Check if this is new format: modules with lessons that have sections
  // Also check for lessons that have title as LocalizedText (new format indicator)
  const firstLesson = curriculumContent?.modules?.[0]?.lessons?.[0];
  const hasNewFormat = firstLesson && (
    Array.isArray(firstLesson.sections) ||  // Has sections array
    (typeof firstLesson.title === 'object' && firstLesson.title?.en)  // Title is LocalizedText
  );

  if (hasNewFormat) {
    // New format: preserve modules structure, let adapter handle it
    console.log('[curriculumApi] Detected new modules format with sections, preserving modules');
    const createdAt = raw.created_at || courseData.created_at ? new Date(raw.created_at || courseData.created_at) : new Date();

    // Create chapters from modules for legacy compatibility
    // Each module becomes a chapter, each lesson is a sub-item
    const chapters = (curriculumContent.modules || []).flatMap((module: any, mi: number) =>
      (module.lessons || []).map((lesson: any, li: number) => ({
        id: lesson.lesson_id || `m${mi}-l${li}`,
        title: typeof lesson.title === 'object' ? lesson.title.jp || lesson.title.en : lesson.title,
        duration: lesson.reading_time?.jp || lesson.reading_time?.en || `${lesson.estimated_min || 10}分`,
        type: 'ドキュメント',
        content: typeof lesson.subtitle === 'object' ? lesson.subtitle.jp || lesson.subtitle.en : lesson.subtitle,
        // Preserve full lesson data for adapter
        _lessonData: lesson,
        _moduleIndex: mi,
        _lessonIndex: li
      }))
    );

    return {
      id: raw.id || courseData.id || curriculumContent.curriculum_id,
      title: typeof curriculumContent.title === 'object' ? curriculumContent.title.jp || curriculumContent.title.en : curriculumContent.title,
      description: typeof curriculumContent.description === 'object' ? curriculumContent.description.jp || curriculumContent.description.en : curriculumContent.description,
      chapters,
      // Preserve modules for adapter
      modules: curriculumContent.modules,
      ui_template_id: curriculumContent.ui_template_id || 'doc_chapter',
      createdAt,
      duration: `${Math.round((curriculumContent.modules || []).reduce((sum: number, m: any) => sum + (m.estimated_hours || 0), 0))}時間`,
      modelUsed: 'flash',
      preferredTemplate: 'doc_chapter'
    } as any;
  }

  const normalized = isVibeCodingCurriculum(curriculumContent)
    ? mapVibeCodingToGeneratedCourse(curriculumContent)
    : (curriculumContent as GeneratedCourse);

  const createdAt = raw.created_at || courseData.created_at ? new Date(raw.created_at || courseData.created_at) : new Date();

  // Ensure chapters exists (V2 uses modules)
  const chapters = normalized.chapters || (normalized as any).modules || [];

  // Always preserve modules for adapter
  const modules = curriculumContent.modules || (normalized as any).modules;

  console.log('[curriculumApi] Normalized result:', {
    chaptersCount: chapters.length,
    modulesCount: modules?.length,
    hasModules: !!modules,
    normalizedId: normalized.id,
    normalizedTitle: normalized.title
  });

  return {
    ...normalized,
    chapters,
    modules,  // Always include modules for adapter
    id: raw.id || courseData.id || normalized.id,
    title: typeof normalized.title === 'object' ? (normalized.title as any).jp || (normalized.title as any).en : normalized.title,
    description: typeof normalized.description === 'object' ? (normalized.description as any).jp || (normalized.description as any).en : normalized.description,
    createdAt
  };
};

export const fetchGeneratedCourses = async (): Promise<Course[]> => {
  const response = await fetch(`${API_BASE}/curricula`);
  if (!response.ok) {
    throw new Error('Failed to load curricula.');
  }
  const payload: CurriculumListResponse = await response.json();

  return (payload.curricula || []).map(row => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'AI Generated',
    progress: 0,
    totalLessons: 0,
    completedLessons: 0,
    thumbnail: row.thumbnail || 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&q=80&w=800',
    color: row.color || 'bg-indigo-500',
    source: 'generated'
  }));
};

export const fetchGeneratedCourseById = async (id: string): Promise<GeneratedCourse> => {
  if (USE_DEMO_MODE && id === DEMO_CURRICULUM_ID) {
    // Return normalized demo data
    return normalizeGeneratedCourse(DEMO_COURSE_DATA);
  }

  const response = await fetch(`${API_BASE}/curricula/${id}`);
  if (!response.ok) {
    throw new Error('Failed to load curriculum.');
  }
  const payload: CurriculumDetailResponse = await response.json();
  if (!payload.curriculum && !payload.course) {
    throw new Error(payload.error || 'Curriculum not found.');
  }

  return normalizeGeneratedCourse(payload);
};

export const saveGeneratedCourse = async (course: GeneratedCourse): Promise<void> => {
  // v2 uses automatic save during generation flow, 
  // but keeping this for compatibility if needed.
  const response = await fetch('/api/curricula', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Failed to save curriculum.');
  }
};

// --- V2 AI Chat & Decision ---

export const sendAiChat = async (message: string, sessionId?: string, attachments: any[] = []) => {
  if (USE_DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate 2s latency

    // Simulating Initial Response for any input
    if (!sessionId) {
      return {
        session_id: DEMO_SESSION_ID,
        curriculum_id: DEMO_CURRICULUM_ID,
        message: "興味深いテーマですね！\n\nご希望に合わせて、以下の要件で学習プランを提案させていただきます。\n\n### 学習要件案\n- **対象レベル**: 初心者からスタート\n- **ゴール**: 実践的なスキルの習得\n- **形式**: 講義とハンズオン\n\nこの方向性で進めてよろしいでしょうか？",
        pending_approval: 'requirements'
      };
    }

    // Default chat fallback in demo
    return {
      session_id: sessionId || DEMO_SESSION_ID,
      curriculum_id: DEMO_CURRICULUM_ID,
      message: "ありがとうございます。ご要望を取り入れながら調整を進めます。\n\n確認のため、一度現状の内容で承認プロセスに進んでいただけますか？",
      pending_approval: 'requirements'
    };
  }

  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId, attachments }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Chat failed.');
  }
  return await response.json();
};

export const sendAiDecision = async (curriculumId: string, sessionId: string, stage: string, decision: 'approved' | 'revise', feedbackText?: string) => {
  if (USE_DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (decision === 'revise') {
      return {
        status: 'revised',
        message: "フィードバックありがとうございます。内容を修正しました。\n再度ご確認ください。",
        pending_approval: stage
      };
    }

    if (stage === 'requirements') {
      return {
        session_id: sessionId,
        curriculum_id: curriculumId,
        message: "要件を確定しました。\n\n続いて、具体的な学習ロードマップを作成しました。\n\n### ロードマップ案\n1. **基礎編**: 基本概念の理解\n2. **応用編**: ツールとライブラリの活用\n3. **実践編**: プロジェクト制作\n\nこのステップで進めますか？",
        pending_approval: 'roadmap'
      };
    }

    if (stage === 'roadmap') {
      return {
        session_id: sessionId,
        curriculum_id: curriculumId,
        message: "ロードマップを確定しました。\n\n最後に、各レッスンの詳細内容（カリキュラム）を構築しました。\n\n詳細を確認し、問題なければ最終生成を行ってください。",
        pending_approval: 'curriculum'
      };
    }

    if (stage === 'curriculum') {
      return {
        status: 'approved',
        curriculum_id: curriculumId,
        message: "承認ありがとうございます。\n\nあなた専用のコースを生成し、ライブラリに保存しました！"
      };
    }
  }

  const response = await fetch(`${API_BASE}/ai/curricula/${curriculumId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, stage, decision, feedback_text: feedbackText }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Decision failed.');
  }
  return await response.json();
};

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed.');
  }
  return await response.json();
};
