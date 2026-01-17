import React from 'react';
import { ArrowLeft, Play, Clock, Award, BookOpen, Share2 } from 'lucide-react';
import { GeneratedCourse } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';

interface GeneratedCourseViewProps {
    course: GeneratedCourse;
    onBack: () => void;
    onStartLesson: (moduleIndex: number, lessonIndex: number) => void;
}

const GeneratedCourseView: React.FC<GeneratedCourseViewProps> = ({ course, onBack, onStartLesson }) => {
    const { language } = useLanguage();
    console.log("GeneratedCourseView: Rendering with course:", {
        id: course.id,
        title: course.title,
        chaptersCount: course.chapters?.length,
    });

    const displayTitle = typeof course.title === 'object'
        ? ((course.title as any).jp || (course.title as any).en || JSON.stringify(course.title))
        : course.title;

    const copy = {
        en: {
            back: 'Back to Library',
            generatedWith: 'Generated with',
            modelPro: 'Gemini 3.0 Pro',
            modelFlash: 'Gemini 2.0 Flash',
            start: 'Start Learning',
            share: 'Share',
            pathTitle: 'Curriculum Path',
            completion: 'Completion Certificate'
        },
        jp: {
            back: 'ライブラリに戻る',
            generatedWith: '生成モデル',
            modelPro: 'Gemini 3.0 Pro',
            modelFlash: 'Gemini 2.0 Flash',
            start: '学習を開始',
            share: '共有',
            pathTitle: 'カリキュラムパス',
            completion: '修了証'
        }
    } as const;
    const t = copy[language];

    const handleStartClick = () => {
        console.log("Start Learning clicked");
        onStartLesson(0, 0);
    };

    const handleChapterClick = (chapterIndex: number) => {
        console.log("Chapter clicked:", chapterIndex);
        onStartLesson(chapterIndex, 0);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Hero */}
            <div className="bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>

                <div className="max-w-4xl mx-auto px-6 pt-12 pb-24 relative z-10">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-white mb-8 transition-colors">
                        <ArrowLeft size={20} /> {t.back}
                    </button>

                    <div className="flex gap-4 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur ${course.modelUsed === 'pro'
                                ? 'bg-purple-500/80 border-purple-400/50'
                                : 'bg-indigo-500/80 border-indigo-400/50'
                            }`}>
                            {t.generatedWith} {course.modelUsed === 'pro' ? t.modelPro : t.modelFlash}
                        </span>
                        <span className="bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10 flex items-center gap-1"><Clock size={12} /> {course.duration}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{displayTitle}</h1>
                    <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">{course.description}</p>

                    <div className="mt-8 flex gap-4">
                        <button onClick={handleStartClick} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2">
                            <Play size={20} fill="currentColor" /> {t.start}
                        </button>
                        <button className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2">
                            <Share2 size={20} /> {t.share}
                        </button>
                    </div>
                </div>
            </div>

            {/* Path */}
            <div className="max-w-3xl mx-auto px-6 -mt-16 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                        <BookOpen size={24} className="text-indigo-600" /> {t.pathTitle}
                    </h2>

                    <div className="relative">
                        {/* Line */}
                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200"></div>

                        <div className="space-y-8">
                            {course.chapters.map((chapter, index) => (
                                <div
                                    key={chapter.id}
                                    className="relative flex items-start gap-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                                    onClick={() => handleChapterClick(index)}
                                >
                                    {/* Node */}
                                    <div className="w-12 h-12 rounded-full bg-white border-4 border-indigo-100 flex items-center justify-center relative z-10 shrink-0 shadow-sm group-hover:scale-110 transition-transform group-hover:border-indigo-200">
                                        <span className="text-lg font-bold text-indigo-600">{index + 1}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pt-1.5">
                                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">{chapter.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><Clock size={12} /> {chapter.duration}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{chapter.type}</span>
                                        </div>
                                        {chapter.content && (
                                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{chapter.content}</p>
                                        )}
                                    </div>

                                    <div className="pt-3 text-slate-300 group-hover:text-indigo-400">
                                        <Play size={20} />
                                    </div>
                                </div>
                            ))}

                            {/* Final Reward */}
                            <div className="relative flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center relative z-10 shrink-0 text-emerald-600">
                                    <Award size={24} />
                                </div>
                                <div className="pt-2">
                                    <h3 className="font-bold text-slate-400">{t.completion}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneratedCourseView;
