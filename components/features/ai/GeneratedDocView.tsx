import React, { useState, useEffect, useRef, useId } from 'react';
import {
    ArrowLeft, BookOpen, List, Clock,
    ChevronRight, AlertTriangle, Info, Lightbulb, CheckCircle2,
    Copy, Check, FileText, Brain, ChevronDown, ChevronLeft, ChevronUp
} from 'lucide-react';
import mermaid from 'mermaid';
import { DocChapter, DocSection, LocalizedDocBlock, LocalizedText, QuizData } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { GeneratedLesson } from '../../../services/curriculumAdapter';

// Helper to handle both string (legacy/resolved) and LocalizedText
const getText = (content: string | LocalizedText | undefined, lang: 'en' | 'jp'): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return content[lang] || content['en'] || '';
};

interface GeneratedDocViewProps {
    lesson: GeneratedLesson;
    onBack: () => void;
    onComplete: () => void;
    onNextLesson?: () => void;
    onPrevLesson?: () => void;
    language: 'en' | 'jp';
    setLanguage?: (lang: 'en' | 'jp') => void;
    courseTitle?: string;
    hasNext?: boolean;
    hasPrev?: boolean;
}

const GeneratedDocView: React.FC<GeneratedDocViewProps> = ({
    lesson,
    onBack,
    onComplete,
    onNextLesson,
    onPrevLesson,
    language,
    setLanguage,
    courseTitle,
    hasNext,
    hasPrev
}) => {
    const { setTheme } = useTheme();
    const [activeSection, setActiveSection] = useState<string>('');
    const [viewMode, setViewMode] = useState<'doc' | 'quiz'>('doc');
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    const t = {
        en: {
            tag: courseTitle || "Generated Curriculum",
            onThisPage: "On this page",
            backToCourse: "Back to Course",
            completeChapter: "Complete Lesson",
            takeQuiz: "Take Quiz",
            complete: "Complete",
            doc: "Doc",
            quiz: "Quiz",
            nextLesson: "Next Lesson",
            prevLesson: "Previous",
            checkAnswers: "Check Answers",
            correct: "Correct!",
            incorrect: "Incorrect",
            score: "Score"
        },
        jp: {
            tag: courseTitle || "生成カリキュラム",
            onThisPage: "このページの目次",
            backToCourse: "コースに戻る",
            completeChapter: "レッスンを完了",
            takeQuiz: "クイズに挑戦",
            complete: "完了",
            doc: "ドキュメント",
            quiz: "クイズ",
            nextLesson: "次のレッスン",
            prevLesson: "前へ",
            checkAnswers: "回答を確認",
            correct: "正解！",
            incorrect: "不正解",
            score: "スコア"
        }
    }[language];

    useEffect(() => {
        setTheme('light');
        mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: 'sans-serif'
        });
        return () => setTheme('system');
    }, [setTheme]);

    // Scroll Spy Logic
    useEffect(() => {
        if (viewMode !== 'doc') return;

        observer.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, { rootMargin: '-20% 0px -60% 0px' });

        lesson.sections.forEach((section) => {
            const el = document.getElementById(section.id);
            if (el) observer.current?.observe(el);
        });

        return () => observer.current?.disconnect();
    }, [lesson, viewMode]);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };

    useEffect(() => {
        if (viewMode === 'doc') {
            mermaid.contentLoaded();
        }
    }, [lesson, viewMode]);

    const handleQuizAnswer = (questionId: string, optionId: string) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleQuizSubmit = () => {
        setQuizSubmitted(true);
    };

    const getQuizScore = () => {
        if (!lesson.quiz) return { correct: 0, total: 0 };
        let correct = 0;
        lesson.quiz.questions.forEach(q => {
            if (quizAnswers[q.id] === q.correctAnswer) correct++;
        });
        return { correct, total: lesson.quiz.questions.length };
    };

    return (
        <div className="min-h-screen bg-white text-slate-800 font-sans">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{t.tag}</span>
                        <span className="text-sm font-bold text-slate-800 line-clamp-1">{getText(lesson.title, language)}</span>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('doc')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'doc'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText size={14} />
                        {t.doc}
                    </button>

                    {lesson.quiz && (
                        <button
                            onClick={() => setViewMode('quiz')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'quiz'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Brain size={14} />
                            {t.quiz}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {setLanguage && (
                        <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200/60">
                            <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'en' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>EN</button>
                            <button onClick={() => setLanguage('jp')} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'jp' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>JP</button>
                        </div>
                    )}
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={14} /> {getText(lesson.readingTime, language)}
                    </span>
                </div>
            </header>

            {viewMode === 'doc' && (
                <main className="pt-24 pb-20 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Main Content */}
                    <article className="lg:col-span-8 lg:col-start-2 xl:col-span-7 xl:col-start-3">
                        <header className="mb-12 text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wider mb-6">
                                <BookOpen size={14} /> Lesson
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
                                {getText(lesson.title, language)}
                            </h1>
                            <p className="text-xl text-slate-500 leading-relaxed font-serif italic">
                                {getText(lesson.subtitle, language)}
                            </p>
                        </header>

                        <div className="space-y-16">
                            {lesson.sections.map((section) => (
                                <section key={section.id} id={section.id} className="scroll-mt-24">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 group cursor-pointer" onClick={() => scrollToSection(section.id)}>
                                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-sm group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">#</span>
                                        {getText(section.title, language)}
                                    </h2>
                                    <div className="space-y-8">
                                        {section.content.map((block, idx) => (
                                            <BlockRenderer key={idx} block={block} language={language} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>

                        {/* Lesson Footer */}
                        <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex gap-2">
                                {hasPrev && onPrevLesson && (
                                    <button onClick={onPrevLesson} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-slate-50">
                                        <ChevronLeft size={16} /> {t.prevLesson}
                                    </button>
                                )}
                                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-slate-50">
                                    <ArrowLeft size={16} /> {t.backToCourse}
                                </button>
                            </div>
                            <div className="flex gap-2">
                                {lesson.quiz ? (
                                    <button
                                        onClick={() => setViewMode('quiz')}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                                    >
                                        {t.takeQuiz} <Brain size={18} />
                                    </button>
                                ) : hasNext && onNextLesson ? (
                                    <button
                                        onClick={onNextLesson}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                                    >
                                        {t.nextLesson} <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={onComplete}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                                    >
                                        {t.complete} <CheckCircle2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </article>

                    {/* Right Sidebar (TOC) */}
                    <aside className="hidden xl:block col-span-2 relative">
                        <div className="sticky top-32">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <List size={14} /> {t.onThisPage}
                            </h3>
                            <ul className="space-y-1 relative border-l border-slate-100">
                                {lesson.sections.map((section) => (
                                    <li key={section.id} className="relative">
                                        <button
                                            onClick={() => scrollToSection(section.id)}
                                            className={`text-sm py-1.5 pl-4 text-left w-full transition-colors border-l-2 -ml-[2px] ${activeSection === section.id
                                                    ? 'border-purple-500 text-purple-600 font-medium'
                                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                                }`}
                                        >
                                            {getText(section.title, language)}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>

                </main>
            )}

            {/* Quiz View */}
            {viewMode === 'quiz' && lesson.quiz && (
                <main className="pt-24 pb-20 max-w-3xl mx-auto px-6">
                    <div className="mb-8">
                        <button onClick={() => setViewMode('doc')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4">
                            <ArrowLeft size={16} /> Back to Document
                        </button>
                        <h1 className="text-3xl font-bold text-slate-900">{getText(lesson.quiz.title, language)}</h1>
                    </div>

                    <div className="space-y-8">
                        {lesson.quiz.questions.map((question, qIdx) => {
                            const isAnswered = !!quizAnswers[question.id];
                            const isCorrect = quizAnswers[question.id] === question.correctAnswer;

                            return (
                                <div key={question.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
                                            {qIdx + 1}
                                        </span>
                                        <h3 className="text-lg font-medium text-slate-900">{getText(question.text, language)}</h3>
                                    </div>

                                    <div className="space-y-3 ml-12">
                                        {question.options.map((option) => {
                                            const isSelected = quizAnswers[question.id] === option.id;
                                            const showCorrect = quizSubmitted && option.id === question.correctAnswer;
                                            const showIncorrect = quizSubmitted && isSelected && !isCorrect;

                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => handleQuizAnswer(question.id, option.id)}
                                                    disabled={quizSubmitted}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${showCorrect
                                                            ? 'border-green-500 bg-green-50 text-green-800'
                                                            : showIncorrect
                                                                ? 'border-red-500 bg-red-50 text-red-800'
                                                                : isSelected
                                                                    ? 'border-purple-500 bg-purple-50'
                                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                                                            }`}>
                                                            {isSelected && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <span>{getText(option.text, language)}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {quizSubmitted && (
                                        <div className={`mt-4 ml-12 p-3 rounded-lg ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            <span className="font-bold">{isCorrect ? t.correct : t.incorrect}</span>
                                            {question.explanation && getText(question.explanation, language) && (
                                                <p className="mt-1 text-sm">{getText(question.explanation, language)}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Quiz Footer */}
                    <div className="mt-8 flex justify-between items-center">
                        {quizSubmitted ? (
                            <>
                                <div className="text-lg font-bold">
                                    {t.score}: {getQuizScore().correct} / {getQuizScore().total}
                                </div>
                                {hasNext && onNextLesson ? (
                                    <button
                                        onClick={onNextLesson}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                                    >
                                        {t.nextLesson} <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={onComplete}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                                    >
                                        {t.complete} <CheckCircle2 size={18} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div />
                                <button
                                    onClick={handleQuizSubmit}
                                    disabled={Object.keys(quizAnswers).length < (lesson.quiz?.questions.length || 0)}
                                    className="bg-purple-600 text-white px-6 py-3 rounded-full font-bold hover:bg-purple-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t.checkAnswers} <CheckCircle2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </main>
            )}
        </div>
    );
};

// --- Mermaid Block Component ---
const MermaidBlock: React.FC<{ chart: string; caption?: LocalizedText | string; language: 'en' | 'jp' }> = ({ chart, caption, language }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState<string>('');
    const id = useId().replace(/:/g, '');

    useEffect(() => {
        const renderChart = async () => {
            if (!containerRef.current) return;
            try {
                const uniqueRenderId = `mermaid-svg-${id}-${Date.now()}`;
                const { svg } = await mermaid.render(uniqueRenderId, chart);
                setSvgContent(svg);
            } catch (error) {
                console.error('Mermaid rendering failed:', error);
                setSvgContent(`<div class="p-4 bg-red-50 text-red-600 text-sm font-mono rounded">Diagram Error: Invalid Syntax</div>`);
            }
        };
        renderChart();
    }, [chart, id]);

    return (
        <div className="my-8 p-8 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center relative">
            <div className="absolute top-4 right-4 px-2 py-1 bg-white rounded border border-slate-200 text-[10px] font-bold text-slate-400 uppercase">Diagram</div>
            <div ref={containerRef} className="w-full flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svgContent }} />
            {caption && <p className="mt-4 text-sm text-slate-500 font-medium text-center">{getText(caption, language)}</p>}
        </div>
    );
};

// --- Block Renderers ---
const BlockRenderer: React.FC<{ block: LocalizedDocBlock; language: 'en' | 'jp' }> = ({ block, language }) => {
    switch (block.type) {
        case 'text':
            return (
                <p className={`
               leading-8 text-slate-700
               ${block.style === 'lead' ? 'text-xl font-light text-slate-600 mb-8' : 'text-base'}
               ${block.style === 'quote' ? 'font-serif text-lg italic text-slate-600 border-l-4 border-slate-200 pl-4 py-1' : ''}
            `}>
                    {getText(block.text, language)}
                </p>
            );

        case 'image':
            return (
                <figure className={`my-8 ${block.layout === 'full' ? '-mx-6 md:-mx-12' : ''}`}>
                    <img src={block.src} alt={block.alt} className="w-full rounded-xl shadow-md border border-slate-100" />
                    {block.caption && <figcaption className="text-center text-xs text-slate-400 mt-2 font-medium">{getText(block.caption, language)}</figcaption>}
                </figure>
            );

        case 'code':
            return (
                <div className="my-6 rounded-xl overflow-hidden bg-[#1e1e1e] shadow-lg border border-slate-800/50 group">
                    {block.filename && <div className="bg-[#252526] px-4 py-2 text-xs text-slate-400 font-mono border-b border-white/5 flex justify-between items-center"><span>{block.filename}</span><span className="uppercase opacity-50">{block.language}</span></div>}
                    <pre className="p-4 overflow-x-auto text-sm font-mono text-blue-100 leading-relaxed"><code>{block.code}</code></pre>
                </div>
            );

        case 'callout':
            const variants = {
                info: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', icon: Info, iconColor: 'text-blue-500' },
                warning: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-500' },
                tip: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', icon: Lightbulb, iconColor: 'text-emerald-500' },
                success: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-900', icon: CheckCircle2, iconColor: 'text-green-500' },
            };
            const style = variants[block.variant];
            const Icon = style.icon;
            return (
                <div className={`my-8 p-6 rounded-xl border ${style.bg} ${style.border} flex gap-4`}>
                    <div className={`mt-0.5 shrink-0 ${style.iconColor}`}><Icon size={20} /></div>
                    <div>
                        {block.title && <h4 className={`font-bold text-sm uppercase tracking-wide mb-2 ${style.text} opacity-80`}>{getText(block.title, language)}</h4>}
                        <p className={`text-sm leading-relaxed ${style.text}`}>
                            {getText(block.text, language)}
                        </p>
                    </div>
                </div>
            );

        case 'list':
            return (
                <ul className={`my-6 space-y-3 ${block.style === 'number' ? 'list-decimal pl-5' : ''}`}>
                    {block.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-slate-700 leading-relaxed group">
                            {block.style !== 'number' && <span className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 group-hover:scale-125 transition-transform" />}
                            <span>{getText(item, language)}</span>
                        </li>
                    ))}
                </ul>
            );

        case 'mermaid':
            return <MermaidBlock chart={block.chart} caption={block.caption} language={language} />;

        case 'table':
            return (
                <div className="my-8 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                {block.headers.map((header, i) => (
                                    <th key={i} className="px-4 py-3 text-left text-sm font-bold text-slate-700 border-b border-slate-200">
                                        {getText(header, language)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-slate-50">
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100">
                                            {getText(cell, language)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'mindmap':
            return (
                <div className="my-12 p-8 bg-slate-50/50 rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Brain size={14} className="text-purple-500" /> Interactive Mind Map
                    </div>
                    <MindMapNode node={block.root} language={language} isRoot />
                </div>
            );

        default:
            return null;
    }
};

// --- MindMap Node Component ---
const MindMapNode: React.FC<{
    node: { text: LocalizedText | string; details?: LocalizedText | string; children?: any[] };
    language: 'en' | 'jp';
    isRoot?: boolean;
}> = ({ node, language, isRoot }) => {
    const [isOpen, setIsOpen] = useState(isRoot);

    return (
        <div className="flex flex-col gap-2">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
          p-4 rounded-xl border-2 transition-all cursor-pointer group relative
          ${isRoot
                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-200'
                        : 'bg-white border-slate-100 hover:border-purple-200 text-slate-700 shadow-sm'}
        `}
            >
                <div className="flex items-center justify-between gap-4">
                    <span className={`font-bold ${isRoot ? 'text-lg' : 'text-sm'}`}>{getText(node.text, language)}</span>
                    {node.children && (
                        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                            <ChevronDown size={16} className={isRoot ? 'text-white/70' : 'text-slate-400'} />
                        </div>
                    )}
                </div>

                {isOpen && node.details && (
                    <div className={`mt-2 text-xs leading-relaxed ${isRoot ? 'text-purple-100' : 'text-slate-500'}`}>
                        {getText(node.details, language)}
                    </div>
                )}

                {!isRoot && <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-slate-100 group-hover:bg-purple-100" />}
            </div>

            {isOpen && node.children && (
                <div className="pl-8 border-l-2 border-purple-50 flex flex-col gap-4 mt-2 ml-4">
                    {node.children.map((child, idx) => (
                        <MindMapNode key={idx} node={child} language={language} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GeneratedDocView;
