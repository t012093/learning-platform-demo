import { Course, GeneratedCourse } from '../types';
import { isVibeCodingCurriculum, mapVibeCodingToGeneratedCourse } from './vibeCodingAdapter';

type CurriculumListResponse = {
  ok: boolean;
  courses?: Course[];
  error?: string;
};

type CurriculumDetailResponse = {
  ok: boolean;
  course?: GeneratedCourse;
  error?: string;
};

const normalizeGeneratedCourse = (raw: unknown): GeneratedCourse => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid curriculum payload.');
  }
  const normalized = isVibeCodingCurriculum(raw)
    ? mapVibeCodingToGeneratedCourse(raw)
    : (raw as GeneratedCourse);
  const createdAt = normalized?.createdAt ? new Date(normalized.createdAt) : new Date();
  return { ...normalized, createdAt };
};

export const fetchGeneratedCourses = async (): Promise<Course[]> => {
  const response = await fetch('/api/curricula');
  if (!response.ok) {
    throw new Error('Failed to load curricula.');
  }
  const payload: CurriculumListResponse = await response.json();
  return Array.isArray(payload.courses) ? payload.courses : [];
};

export const fetchGeneratedCourseById = async (id: string): Promise<GeneratedCourse> => {
  const response = await fetch(`/api/curricula/${id}`);
  if (!response.ok) {
    throw new Error('Failed to load curriculum.');
  }
  const payload: CurriculumDetailResponse = await response.json();
  if (!payload.course) {
    throw new Error(payload.error || 'Curriculum not found.');
  }
  return normalizeGeneratedCourse(payload.course);
};

export const saveGeneratedCourse = async (course: GeneratedCourse): Promise<void> => {
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
