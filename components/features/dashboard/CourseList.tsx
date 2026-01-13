import React, { useEffect, useState } from 'react';
import { Course } from '../../../types';
import { COURSES_DATA } from '../../../services/curriculumData';
import { fetchGeneratedCourses } from '../../../services/curriculumApi';
import { Briefcase } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

interface CourseListProps {
  onSelectCourse: (course: Course) => void;
}

const CourseList: React.FC<CourseListProps> = ({ onSelectCourse }) => {
  const { language } = useLanguage();
  const curatedCourses = COURSES_DATA.map(course => ({ ...course, source: 'curated' as const }));
  const [courses, setCourses] = useState<Course[]>(curatedCourses);
  const copy = {
    en: {
      title: 'Curriculum',
      subtitle: 'Choose a path to boost your fluency.',
      categories: ['All Levels', 'Beginner', 'Intermediate', 'Advanced', 'Business', 'Test Prep'],
      lessons: 'Lessons',
      completed: 'Completed',
      startLearning: 'Start Learning'
    },
    jp: {
      title: 'カリキュラム',
      subtitle: '学習パスを選択してください。',
      categories: ['すべて', '初級', '中級', '上級', 'ビジネス', '試験対策'],
      lessons: 'レッスン',
      completed: '完了',
      startLearning: '学習を開始'
    }
  } as const;
  const t = copy[language];

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      try {
        const generated = await fetchGeneratedCourses();
        if (!isMounted) return;
        const generatedCourses = generated.map(course => ({
          ...course,
          source: course.source || 'generated',
        }));
        const seen = new Set<string>();
        const merged = [...generatedCourses, ...curatedCourses].filter(course => {
          if (seen.has(course.id)) return false;
          seen.add(course.id);
          return true;
        });
        setCourses(merged);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load generated curricula:', error);
        setCourses(curatedCourses);
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-slate-500 mt-2">{t.subtitle}</p>
        
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
          {t.categories.map((cat, i) => (
            <button 
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border
                ${i === 0 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div 
            key={course.id} 
            onClick={() => onSelectCourse(course)}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col h-full"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={course.thumbnail} 
                alt={course.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-slate-900 shadow-sm uppercase tracking-wider">
                  {course.category}
                </span>
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-lg text-slate-900 mb-2">{course.title}</h3>
              <p className="text-slate-500 text-sm mb-4 flex-1">{course.description}</p>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mb-4">
                 <div className="flex items-center gap-1">
                   <Briefcase size={14} /> 
                   <span>{course.totalLessons} {t.lessons}</span>
                 </div>
              </div>

              {course.progress > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{course.progress}% {t.completed}</span>
                    <span>{course.completedLessons}/{course.totalLessons}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`${course.color} h-full rounded-full`} 
                      style={{ width: `${course.progress}%` }} 
                    />
                  </div>
                </div>
              ) : (
                <button className="w-full py-3 text-center text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
                  {t.startLearning}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseList;
