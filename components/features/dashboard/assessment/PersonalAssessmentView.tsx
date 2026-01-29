
import React, { useState, useEffect } from 'react';
import { ViewState, Big5Profile, AssessmentProfile, PersonalityType, AIAdvice } from '../../../../types';
import PersonalityAssessment from './PersonalityAssessment';
import IntroSequence from './IntroSequence';
import ComprehensiveResults from './ComprehensiveResults';
import { analyzePersonality } from '../../../../services/geminiService';
import { useTheme } from '../../../../context/ThemeContext';
import { Loader2, Sparkles, Brain, ArrowRight } from 'lucide-react';
import { STORAGE_KEY } from './assessmentConstants';
import { useLanguage } from '../../../../context/LanguageContext';

interface PersonalAssessmentViewProps {
  onNavigate: (view: ViewState) => void;
}

enum Step {
  OVERVIEW = 'OVERVIEW',
  ASSESSMENT = 'ASSESSMENT',
  ANALYZING = 'ANALYZING',
  INTRO = 'INTRO',
  RESULTS = 'RESULTS'
}

const USE_DEMO_ASSESSMENT = true;

const DEMO_AI_ADVICE_BY_LANG: Record<'en' | 'jp', AIAdvice> = {
  en: {
    strengths: [
      { title: 'Adaptability', description: 'Switches learning approaches as the situation changes.' },
      { title: 'Balanced execution', description: 'Balances depth and speed without losing quality.' },
      { title: 'Collaborative momentum', description: 'Moves forward with the team while keeping alignment.' }
    ],
    growthTips: [
      { title: 'Make progress visible', description: 'Ship a small output weekly and log what you learned.' },
      { title: 'Protect focus time', description: 'Reserve a fixed 30‑minute block daily.' },
      { title: 'Set a challenge scope', description: 'Choose one theme and go deep for a short period.' }
    ],
    learningStrategy: {
      title: 'Short-cycle experimentation',
      approach: 'Try small, reflect fast, iterate',
      steps: [
        { label: 'Step 1', action: 'Solve a 15‑minute mini task' },
        { label: 'Step 2', action: 'Write a 3‑line reflection' },
        { label: 'Step 3', action: 'Improve one thing and retry tomorrow' }
      ]
    },
    careerCompatibility: 'Product building, learning support, team-based creative work',
    relationshipAnalysis: {
      style: 'A calm driver who adapts and keeps the team aligned.',
      idealPartner: 'Pairs well with fast decision-makers.',
      advice: 'Clarify roles to maximize your strengths.'
    },
    businessPartnership: {
      role: 'Project coordinator: strong at alignment and progress tracking.',
      bestSync: 'Best with a builder-type specialist.',
      warning: 'Over-optimizing can slow decisions.'
    },
    hiddenTalent: {
      title: 'Quiet consistency',
      description: 'Steady effort compounds into big results.'
    }
  },
  jp: {
    strengths: [
      { title: '状況適応力', description: '変化に強く、環境に合わせて学習方法を切り替えられる。' },
      { title: 'バランス感覚', description: '深掘りとスピードの両方をほどよく扱える。' },
      { title: '協調的な推進力', description: 'チームに溶け込みながら前進できる。' }
    ],
    growthTips: [
      { title: '成果の見える化', description: '週単位で成果物を作り、学習ログを残す。' },
      { title: '集中時間の確保', description: '1日30分でも固定枠を作り、習慣化する。' },
      { title: '挑戦の範囲を決める', description: '1テーマに絞って深く掘る期間を作る。' }
    ],
    learningStrategy: {
      title: '短いサイクルで試す学習',
      approach: '小さく試して、すぐに振り返るサイクルを回す',
      steps: [
        { label: 'Step 1', action: '15分でミニ課題を解く' },
        { label: 'Step 2', action: '学んだことを3行でメモ' },
        { label: 'Step 3', action: '翌日に1つ改善して再挑戦' }
      ]
    },
    careerCompatibility: 'プロダクト開発、学習支援、チーム型のクリエイティブ領域',
    relationshipAnalysis: {
      style: '相手に合わせて調整しながら、穏やかに推進するタイプ。',
      idealPartner: '意思決定が速い推進型の相棒と好相性。',
      advice: '役割分担を明確にすると、持ち味が最大化します。'
    },
    businessPartnership: {
      role: 'プロジェクト調整役: 進行管理と合意形成が得意。',
      bestSync: '実装に強い職人タイプと組むと成果が早い。',
      warning: '全体最適に寄りすぎると決断が遅くなることがある。'
    },
    hiddenTalent: {
      title: '静かな継続力',
      description: '派手さはなくても、積み上げで大きな成果を出せる。'
    }
  }
};

const PersonalAssessmentView: React.FC<PersonalAssessmentViewProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<Step>(Step.OVERVIEW);
  const [profile, setProfile] = useState<AssessmentProfile | null>(null);
  const { setProfile: setGlobalProfile } = useTheme();
  const { language } = useLanguage();

  const t = {
    en: {
      overviewTitle: 'AI Learning Diagnosis Program',
      overviewBody: 'Visualize your potential and build a personalized curriculum that fits your brain.',
      overviewCta: 'Start Analysis',
      poweredBy: 'Powered by Gemini 2.5 Flash • Big Five Matrix',
      assessmentTitle: 'AI Identity Scan',
      assessmentSubtitle: 'Deep Neural Insight Pattern Analysis in Progress',
      analyzingTitle: 'Running analysis protocol...',
      analyzingSubtitle: 'Constructing Personalized Learning Neural Network'
    },
    jp: {
      overviewTitle: 'AI学習診断プログラム',
      overviewBody: 'あなたの潜在能力を可視化し、脳の特性に最もフィットするパーソナライズされたカリキュラムを構築します。',
      overviewCta: '分析を開始する',
      poweredBy: 'Powered by Gemini 2.5 Flash • Big Five Matrix',
      assessmentTitle: 'AI Identity Scan',
      assessmentSubtitle: 'Deep Neural Insight Pattern Analysis in Progress',
      analyzingTitle: '分析プロトコル実行中...',
      analyzingSubtitle: 'Constructing Personalized Learning Neural Network'
    }
  } as const;
  const labels = t[language];

  // Demo: always start from assessment
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors in demo
    }
  }, []);

  const handleAssessmentComplete = async (finalScores: Big5Profile) => {
    setStep(Step.ANALYZING);

    if (USE_DEMO_ASSESSMENT) {
      await new Promise(resolve => setTimeout(resolve, 1400));
      const demoAdvice = DEMO_AI_ADVICE_BY_LANG[language] || DEMO_AI_ADVICE_BY_LANG.jp;
      const demoProfile: AssessmentProfile = {
        scores: finalScores,
        personalityType: 'バランサー',
        learningStyle: demoAdvice.learningStrategy.title,
        motivation: demoAdvice.learningStrategy.approach,
        completedAt: new Date().toISOString(),
        aiAdvice: demoAdvice
      };
      // Demo: skip persistence
      setProfile(demoProfile);
      setGlobalProfile(finalScores);
      setStep(Step.INTRO);
      return;
    }

    try {
      // Gemini API で分析を実行
      const advice = await analyzePersonality(finalScores);
      console.log("Gemini Advice:", advice);
      
      const newProfile: AssessmentProfile = {
        scores: finalScores,
        personalityType: (advice?.personalityType || 'バランサー') as PersonalityType,
        learningStyle: advice?.learningStrategy?.title || 'バランス型学習',
        motivation: advice?.learningStrategy?.approach || '継続的な改善',
        completedAt: new Date().toISOString(),
        aiAdvice: advice
      };

      // 保存
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      setGlobalProfile(finalScores); // グローバルな性格設定を更新
      setStep(Step.INTRO);
    } catch (error) {
      console.error("Personality analysis failed:", error);
      // エラー時も最低限のプロファイルを作成して結果画面を表示（無限ロード回避）
      const fallbackProfile: AssessmentProfile = {
        scores: finalScores,
        personalityType: 'バランサー',
        learningStyle: '標準学習モード',
        motivation: '安定した成長',
        completedAt: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      setStep(Step.RESULTS); 
    }
  };

  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setStep(Step.ASSESSMENT);
  };

  if (step === Step.OVERVIEW) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white/95 rounded-[2.5rem] p-10 text-center shadow-2xl border border-white/40">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl mx-auto mb-10 flex items-center justify-center text-4xl text-white shadow-xl">
             <Sparkles className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">{labels.overviewTitle}</h1>
          <p className="text-slate-600 mb-10 leading-relaxed font-medium text-lg">
            {labels.overviewBody}
          </p>
          <button 
            onClick={() => setStep(Step.ASSESSMENT)}
            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all transform hover:scale-[1.02] shadow-2xl flex items-center justify-center space-x-3 group"
          >
            <span>{labels.overviewCta}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {labels.poweredBy}
          </p>
        </div>
      </div>
    );
  }

  if (step === Step.ASSESSMENT) {
    return (
      <div className="min-h-screen pt-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase">{labels.assessmentTitle}</h1>
          <p className="text-slate-500 max-w-lg mx-auto font-bold text-xs uppercase tracking-widest opacity-60">
            {labels.assessmentSubtitle}
          </p>
        </div>
        <PersonalityAssessment onComplete={handleAssessmentComplete} />
      </div>
    );
  }

  if (step === Step.ANALYZING) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-8">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-indigo-50">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
          <Brain className="absolute -top-4 -right-4 w-10 h-10 text-amber-400 animate-bounce" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{labels.analyzingTitle}</h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
            {labels.analyzingSubtitle}
          </p>
          <div className="max-w-md mx-auto pt-8">
             <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 animate-[progress_3s_ease-in-out_infinite]"></div>
             </div>
          </div>
        </div>
        <style>{`
          @keyframes progress {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 50%; transform: translateX(50%); }
            100% { width: 0%; transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  if (step === Step.INTRO && profile) {
    return <IntroSequence profile={profile} onFinish={() => setStep(Step.RESULTS)} />;
  }

  if (step === Step.RESULTS && profile) {
    return (
      <div className="pt-8">
        <ComprehensiveResults profile={profile} onRestart={handleRestart} />
      </div>
    );
  }

  return null;
};

export default PersonalAssessmentView;
