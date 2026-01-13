import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Zap, BrainCircuit, Loader2, Brain, CheckCircle, ArrowRight, Send, Infinity, User, Bot, RefreshCw } from 'lucide-react';
import { generateCourse, getMockBlenderCourse, createScopingChat, sendMessageStream, hasGeminiApiKey } from '../../../services/geminiService';
import { GeneratedCourse, Big5Profile, AssessmentProfile, ViewState, Message } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { STORAGE_KEY } from '../dashboard/assessment/assessmentConstants';

interface CourseGeneratorViewProps {
  onBack: () => void;
  onCourseGenerated: (course: GeneratedCourse) => void;
  onNavigate?: (view: ViewState) => void;
}

const buildIntentMeta = (userMessages: Message[]): string => {
  const raw = userMessages.map(m => m.text).join('\n').trim();
  if (!raw) return '';

  const normalized = raw.toLowerCase();
  const lines: string[] = [];

  const level =
    /初心者|初学者|ビギナー|beginner/i.test(raw)
      ? 'Beginner'
      : /中級|intermediate/i.test(raw)
      ? 'Intermediate'
      : /上級|advanced|エキスパート/i.test(raw)
      ? 'Advanced'
      : 'Unspecified';
  lines.push(`Level: ${level}`);

  const goals: string[] = [];
  if (normalized.includes('blender')) goals.push('Blender');
  if (normalized.includes('モデリング') || normalized.includes('modeling')) goals.push('3D Modeling');
  if (normalized.includes('アニメーション') || normalized.includes('animation')) goals.push('Animation');
  if (normalized.includes('スカルプト') || normalized.includes('こね')) goals.push('Sculpting');
  if (goals.length) lines.push(`Goals: ${goals.join(', ')}`);

  const priorities: string[] = [];
  const wantsFirst = normalized.includes('まず') || normalized.includes('最初') || normalized.includes('はじめ');
  if (wantsFirst) {
    if (normalized.includes('こね') || normalized.includes('スカルプト')) priorities.push('Start with Sculpting');
    else if (normalized.includes('モデリング')) priorities.push('Start with Modeling');
    else if (normalized.includes('アニメーション')) priorities.push('Start with Animation');
  }
  if (normalized.includes('次') || normalized.includes('その後') || normalized.includes('あと')) {
    if (normalized.includes('アニメーション')) priorities.push('Then Animation');
  }
  if (priorities.length) lines.push(`Priority: ${priorities.join(' -> ')}`);

  const preferences: string[] = [];
  if (normalized.includes('実践') || normalized.includes('ハンズオン')) preferences.push('Hands-on');
  if (normalized.includes('チュートリアル')) preferences.push('Tutorial-focused');
  if (normalized.includes('プロジェクト')) preferences.push('Project-based');
  if (normalized.includes('短時間') || normalized.includes('短め') || normalized.includes('スキマ')) preferences.push('Short lessons');
  if (preferences.length) lines.push(`Preferences: ${preferences.join(', ')}`);

  return lines.join('\n');
};

const CourseGeneratorView: React.FC<CourseGeneratorViewProps> = ({ onBack, onCourseGenerated, onNavigate }) => {
  const { profile: globalProfile } = useTheme();
  const { language } = useLanguage();
  const [modelType, setModelType] = useState<'standard' | 'pro' | 'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentProfile | null>(null);
  const [hasApiKey, setHasApiKey] = useState(hasGeminiApiKey());
  const hasInitialized = useRef(false);

  const copy = {
    en: {
      initialMessage: "Hello! What would you like to learn today? Share a specific topic and your current level (e.g., beginner).",
      backToLibrary: 'Back to Library',
      headerTitle: 'Concierge Scoping',
      headerSubtitle: 'AI Curriculum Planning Session',
      inputPlaceholder: 'Tell me what you want to learn in detail...',
      analysisActive: 'Analysis Active',
      personalized: 'Personalized',
      assessmentPromptTitle: 'Assessment Recommended',
      assessmentPromptBody: 'A short assessment helps the concierge understand you better.',
      assessmentCta: 'Start Assessment',
      currentEngine: 'Current Engine',
      generateLabel: 'Generate Curriculum',
      generateHintWaiting: '(Start by chatting with AI)',
      generateHintReady: 'Ready to Build',
      generating: 'Generating...',
      resetChat: 'Reset Chat',
      resetMessage: 'Plan reset. Where should we begin?',
      apiKeyMissing: 'Gemini API key is not set. Add it from Profile settings.',
      apiKeyMissingHint: 'Add API key in Profile',
      errorChat: 'Failed to communicate with AI.',
      errorGenerate: 'Failed to generate curriculum.',
      invalidStream: 'Invalid stream response from AI.'
    },
    jp: {
      initialMessage: 'こんにちは！今日はどんなことを学びたいですか？具体的なトピックや、今のレベル（初心者など）を教えてください。',
      backToLibrary: 'ライブラリに戻る',
      headerTitle: '学習プラン相談',
      headerSubtitle: 'AIカリキュラム設計セッション',
      inputPlaceholder: '学びたいことについて具体的に教えてください...',
      analysisActive: '分析中',
      personalized: 'パーソナライズ済み',
      assessmentPromptTitle: '性格診断を推奨',
      assessmentPromptBody: '診断により、AIコンシェルジュがより深くあなたを理解します。',
      assessmentCta: '分析を開始',
      currentEngine: '現在のエンジン',
      generateLabel: 'カリキュラム生成',
      generateHintWaiting: '(AIと対話して開始)',
      generateHintReady: '準備OK',
      generating: '生成中...',
      resetChat: 'チャットをリセット',
      resetMessage: 'プランをリセットしました。何から始めましょうか？',
      apiKeyMissing: 'Gemini APIキーが未設定です。プロフィール画面で入力してください。',
      apiKeyMissingHint: 'APIキーを設定してください',
      errorChat: 'AIとの通信に失敗しました。',
      errorGenerate: 'カリキュラム生成に失敗しました。',
      invalidStream: 'AIから無効なストリーム応答を受信しました。'
    }
  } as const;

  const t = copy[language];

  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatSession = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load assessment results and initialize chat
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const savedStr = localStorage.getItem(STORAGE_KEY);
    let currentAssessment = null;
    if (savedStr) {
      try {
        currentAssessment = JSON.parse(savedStr);
        setAssessment(currentAssessment);
      } catch (e) { console.error(e); }
    }
    
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

  const refreshApiKeyStatus = () => {
    const next = hasGeminiApiKey();
    setHasApiKey(next);
    return next;
  };

  const initChatSession = () => {
    const ready = refreshApiKeyStatus();
    if (!ready) {
      chatSession.current = null;
      setError(t.apiKeyMissing);
      return;
    }
    try {
      chatSession.current = createScopingChat(assessment?.scores || null, modelType);
      setError(null);
    } catch (err) {
      console.error('Failed to init chat session:', err);
      chatSession.current = null;
      setError(t.apiKeyMissing);
    }
  };

  useEffect(() => {
    initChatSession();
  }, [assessment, modelType, language]);

  // Auto scroll chat
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isAiTyping) return;
    if (!refreshApiKeyStatus()) {
      setError(t.apiKeyMissing);
      return;
    }

    if (!chatSession.current) {
        initChatSession();
    }

    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: inputValue,
        timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsAiTyping(true);

    try {
        if (!chatSession.current) {
            throw new Error(t.apiKeyMissing);
        }
        const stream = await sendMessageStream(chatSession.current, inputValue);
        if (!stream || typeof (stream as any)[Symbol.asyncIterator] !== 'function') {
            throw new Error(t.invalidStream);
        }
        let fullText = '';
        
        const aiMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: '', timestamp: new Date(), isStreaming: true }]);

        for await (const chunk of stream) {
            const chunkText = typeof (chunk as any).text === 'function'
                ? (chunk as any).text()
                : (chunk as any).text;
            if (!chunkText) continue;
            fullText += chunkText;
            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
        }
        
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));
    } catch (err) {
        console.error("Chat failed:", err);
        setError(t.errorChat);
    } finally {
        setIsAiTyping(false);
    }
  };

  const handleGenerate = async () => {
    if (!refreshApiKeyStatus()) {
      setError(t.apiKeyMissing);
      return;
    }
    // Extract the "Topic" from the last few messages or just use the whole history as intent
    const userMessages = messages.filter(m => m.role === 'user');
    const userHistory = userMessages.map(m => m.text).join('\n');
    const intentMeta = buildIntentMeta(userMessages);
    const lastUserMsg = [...userMessages].reverse().find(m => m.role === 'user')?.text || "General learning";

    setIsGenerating(true);
    setError(null);

    try {
            const profileToUse: Big5Profile = assessment?.scores || {
                openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50,
            };

            // Use the whole chat as the "intent" for deep personalization
            const course = await generateCourse(lastUserMsg, modelType, profileToUse, undefined, assessment || undefined, userHistory, intentMeta);
            onCourseGenerated(course);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGenerate);
    } finally {
      setIsGenerating(false);
    }
  };

  const ModelButton = ({ active, onClick, icon, label, desc, color, badge }: any) => {
    const colorClasses: any = {
      indigo: active ? 'border-indigo-600 bg-indigo-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200',
      purple: active ? 'border-purple-600 bg-purple-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200',
      blue: active ? 'border-blue-600 bg-blue-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200',
      emerald: active ? 'border-emerald-600 bg-emerald-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200',
    };
    const textClasses: any = {
      indigo: active ? 'text-indigo-900' : 'text-slate-600',
      purple: active ? 'text-purple-900' : 'text-slate-600',
      blue: active ? 'text-blue-900' : 'text-slate-600',
      emerald: active ? 'text-emerald-900' : 'text-slate-600',
    };

    return (
      <button onClick={onClick} className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col h-full ${colorClasses[color]}`}>
        {badge && <div className="absolute top-0 right-0 px-1.5 py-0.5 text-[7px] font-black text-white bg-slate-800 rounded-bl-md">{badge}</div>}
        <div className="flex items-center gap-2 mb-1">
          <div className={active ? `text-${color}-600` : 'text-slate-400'}>{icon}</div>
          <span className={`font-black uppercase tracking-widest text-[9px] ${textClasses[color]}`}>{label}</span>
        </div>
        <p className="text-[9px] text-slate-500 font-medium leading-none">{desc}</p>
      </button>
    );
  };

  const canGenerate = messages.length >= 3; // Minimum interaction required
  const canGenerateWithKey = canGenerate && hasApiKey;

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

            {/* Model Toggle - Compact */}
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                {(['standard', 'pro', 'gemini-2.5-flash', 'gemini-2.5-pro'] as const).map(m => (
                    <button 
                        key={m}
                        onClick={() => setModelType(m)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${modelType === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {m === 'standard'
                            ? '2.0F'
                            : m === 'pro'
                            ? '3.0P'
                            : m.replace('gemini-', '')}
                    </button>
                ))}
            </div>
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
                            <div className={`max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${ 
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isAiTyping && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="w-10 h-10 rounded-2xl bg-white border border-indigo-50 flex items-center justify-center text-indigo-400">
                                <Bot size={20} />
                            </div>
                            <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
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
                            placeholder={t.inputPlaceholder}
                            disabled={!hasApiKey || isAiTyping}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all pr-14 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!hasApiKey || !inputValue.trim() || isAiTyping}
                            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar / Status Area */}
            <div className="w-full md:w-80 border-l border-slate-100 p-8 space-y-8 bg-slate-50/50">
                
                {/* Profile Link */}
                {assessment ? (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Brain size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{t.analysisActive}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{assessment.personalityType}</h3>
                    <p className="text-[11px] text-slate-500 leading-tight mb-4">{assessment.learningStyle}</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <CheckCircle size={12} /> {t.personalized}
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => onNavigate?.(ViewState.AI_DIAGNOSIS)}
                    className="w-full bg-amber-50 border border-amber-200 p-6 rounded-3xl text-left hover:bg-amber-100 transition-colors group"
                  >
                    <h3 className="font-bold text-amber-900 mb-1">{t.assessmentPromptTitle}</h3>
                    <p className="text-[10px] text-amber-700 mb-3">{t.assessmentPromptBody}</p>
                    <span className="text-[10px] font-black text-amber-600 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                        {t.assessmentCta} <ArrowRight size={12} />
                    </span>
                  </button>
                )}

                {/* Model Stats */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t.currentEngine}</h4>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="text-indigo-600"><Zap size={14} /></div>
                            <span className="text-xs font-bold text-slate-700 uppercase">{modelType.replace('gemini-', '')}</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                </div>

                {/* Generate Action */}
                <div className="pt-4">
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !canGenerateWithKey}
                        className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl flex flex-col items-center gap-1 ${ 
                            !canGenerateWithKey || isGenerating
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1 active:scale-[0.98]'
                        }`}
                    >
                        {isGenerating ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                <span>{t.generating}</span>
                            </div>
                        ) : (
                            <>
                                <span>{t.generateLabel}</span>
                                <span className="text-[8px] opacity-60 font-medium normal-case">
                                    {!hasApiKey ? t.apiKeyMissingHint : !canGenerate ? t.generateHintWaiting : t.generateHintReady}
                                </span>
                            </>
                        )}
                    </button>
                    {error && <p className="mt-4 text-[10px] text-red-500 font-bold text-center">{error}</p>}
                </div>

                <div className="mt-auto pt-10 text-center">
                    <button 
                        onClick={() => {
                            setMessages([]);
                            initChatSession();
                            setMessages([{ id: 'reset', role: 'model', text: t.resetMessage, timestamp: new Date() }]);
                        }}
                        className="text-slate-400 hover:text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors"
                    >
                        <RefreshCw size={12} /> {t.resetChat}
                    </button>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseGeneratorView;
