import { Course, GeneratedCourse } from '../types';
import { isVibeCodingCurriculum, mapVibeCodingToGeneratedCourse } from './vibeCodingAdapter';

const API_BASE = '/api/v2';

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
