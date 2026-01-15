import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Zap, BrainCircuit, Loader2, Brain, CheckCircle, ArrowRight, Send, Infinity, User, Bot, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { GeneratedCourse, ViewState, Message } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { sendAiChat, sendAiDecision, fetchGeneratedCourseById } from '../../../services/curriculumApi';

interface CourseGeneratorViewProps {
  onBack: () => void;
  onCourseGenerated: (course: GeneratedCourse) => void;
  onNavigate?: (view: ViewState) => void;
}

const CourseGeneratorView: React.FC<CourseGeneratorViewProps> = ({ onBack, onCourseGenerated, onNavigate }) => {
  const { language } = useLanguage();
  const [modelType, setModelType] = useState<'standard' | 'pro' | 'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // V2 Flow State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<string | null>(null); // 'requirements' | 'roadmap' | 'curriculum'
  
  const copy = {
    en: {
      initialMessage: "Hello! I'm your AI Concierge. Tell me what you want to learn today, and I'll design a custom curriculum for you.",
      backToLibrary: 'Back to Library',
      headerTitle: 'Concierge Scoping',
      headerSubtitle: 'AI Curriculum Planning Session',
      inputPlaceholder: 'E.g. I want to learn Python for Data Science...',
      analysisActive: 'Analysis Active',
      generating: 'Thinking...',
      resetChat: 'Reset Chat',
      resetMessage: 'Plan reset. Where should we begin?',
      errorChat: 'Communication failed.',
      approve: 'Approve & Continue',
      revise: 'Request Changes',
      revisePlaceholder: 'What should be changed?',
      statusRequirements: 'Defining Requirements',
      statusRoadmap: 'Drafting Roadmap',
      statusCurriculum: 'Building Curriculum',
      doneTitle: 'Curriculum Ready!',
      doneMessage: 'Your custom course has been generated and saved.'
    },
    jp: {
      initialMessage: 'こんにちは！AIコンシェルジュです。学びたいテーマを教えていただければ、あなた専用のカリキュラムを設計します。',
      backToLibrary: 'ライブラリに戻る',
      headerTitle: '学習プラン相談',
      headerSubtitle: 'AIカリキュラム設計セッション',
      inputPlaceholder: '例: Pythonでデータ分析を学びたい...',
      analysisActive: '分析中',
      generating: '思考中...',
      resetChat: 'チャットをリセット',
      resetMessage: 'プランをリセットしました。何から始めましょうか？',
      errorChat: '通信に失敗しました。',
      approve: '承認して進む',
      revise: '修正を依頼',
      revisePlaceholder: '修正点を入力...',
      statusRequirements: '要件定義中',
      statusRoadmap: 'ロードマップ作成中',
      statusCurriculum: 'カリキュラム構築中',
      doneTitle: '完成しました！',
      doneMessage: 'あなた専用のコースが生成・保存されました。'
    }
  } as const;

  const t = copy[language];

  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial AI message
    setMessages([
        {
            id: 'init',
            role: 'model',
            text: t.initialMessage,
            timestamp: new Date()
        }
    ]);
  }, []);

  // Auto scroll chat
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating, pendingApproval]);

  const handleSendMessage = async (text?: string) => {
    const msgText = text || inputValue;
    if (!msgText.trim() || isGenerating) return;

    // Determine if this is a "Revise" feedback or normal chat
    const isRevision = pendingApproval !== null && pendingApproval !== 'none';
    
    // Optimistic UI update
    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: msgText,
        timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsGenerating(true);
    setError(null);

    try {
        let response;
        if (isRevision && curriculumId && sessionId && pendingApproval) {
            // Send decision as "revise" with feedback
            response = await sendAiDecision(curriculumId, sessionId, pendingApproval, 'revise', msgText);
        } else {
            // Normal chat
            response = await sendAiChat(msgText, sessionId || undefined);
        }

        handleApiResponse(response);

    } catch (err) {
        console.error("Chat failed:", err);
        setError(t.errorChat);
        setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!curriculumId || !sessionId || !pendingApproval) return;
    setIsGenerating(true);
    try {
        const response = await sendAiDecision(curriculumId, sessionId, pendingApproval, 'approved');
        handleApiResponse(response);
    } catch (err) {
        setError(t.errorChat);
        setIsGenerating(false);
    }
  };

  const handleApiResponse = async (data: any) => {
      setSessionId(data.session_id);
      setCurriculumId(data.curriculum_id);
      setPendingApproval(data.pending_approval); // requirements, roadmap, curriculum, none

      // Add AI response
      if (data.message) {
          const aiMsg: Message = {
              id: Date.now().toString(),
              role: 'model',
              text: data.message,
              timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMsg]);
      }

      setIsGenerating(false);

      // If approved and done (status approved), load course and redirect
      if (data.status === 'approved') {
          const fullCourse = await fetchGeneratedCourseById(data.curriculum_id);
          onCourseGenerated(fullCourse);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 pt-12">
      <div className="max-w-4xl w-full flex flex-col h-[85vh]">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors w-fit"
        >
          <ArrowLeft size={20} /> {t.backToLibrary}
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden flex-1">
          
          {/* Header */}
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Sparkles size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{t.headerTitle}</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t.headerSubtitle}</p>
                </div>
            </div>
            
            {/* Status Badge */}
            {pendingApproval && pendingApproval !== 'none' && (
                <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                    {pendingApproval === 'requirements' ? t.statusRequirements : 
                     pendingApproval === 'roadmap' ? t.statusRoadmap : t.statusCurriculum}
                </div>
            )}
          </div>

          {/* Chat Stage */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Messages Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg, i) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-indigo-600 border border-indigo-50'}`}>
                                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>
                            <div className={`max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${ 
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    
                    {/* Approval UI Card */}
                    {!isGenerating && pendingApproval && pendingApproval !== 'none' && (
                        <div className="mx-14 mb-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    <BrainCircuit size={16} className="text-indigo-500"/> 
                                    Confirmation Required
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    Please review the {pendingApproval} above. Proceed or request changes?
                                </p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleApprove}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        <ThumbsUp size={14} /> {t.approve}
                                    </button>
                                    <button 
                                        onClick={() => { /* Focus input for revision */ }}
                                        className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                                    >
                                        <ThumbsDown size={14} /> {t.revise}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="flex gap-4 animate-pulse mx-4">
                            <div className="w-10 h-10 rounded-2xl bg-white border border-indigo-50 flex items-center justify-center text-indigo-400">
                                <Bot size={20} />
                            </div>
                            <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                                <span className="ml-2 text-xs text-slate-400 font-medium">{t.generating}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="p-6 bg-white border-t border-slate-100">
                    <div className="flex gap-3 relative">
                        <input 
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={pendingApproval && pendingApproval !== 'none' ? t.revisePlaceholder : t.inputPlaceholder}
                            disabled={isGenerating}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all pr-14 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <button 
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isGenerating}
                            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseGeneratorView;