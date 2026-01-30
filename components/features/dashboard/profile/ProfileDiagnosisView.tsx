import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Sparkles, ArrowRight, Eye, CheckCircle2, Flame, Activity } from 'lucide-react';
import { AssessmentProfile, ViewState } from '../../../../types';
import { STORAGE_KEY } from '../assessment/assessmentConstants';
import { useLanguage } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../context/ThemeContext';

interface ProfileDiagnosisViewProps {
  onNavigate: (view: ViewState) => void;
}

const ProfileDiagnosisView: React.FC<ProfileDiagnosisViewProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const { setTheme } = useTheme();
  const [profile, setProfile] = useState<AssessmentProfile | null>(null);

  useEffect(() => {
    setTheme('default');
  }, [setTheme]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setProfile(JSON.parse(raw));
      }
    } catch {
      setProfile(null);
    }
  }, []);

  const copy = {
    en: {
      title: 'AI Diagnosis',
      subtitle: 'Your cognitive signature and learning style.',
      emptyTitle: 'No diagnosis yet',
      emptyBody: 'Run the AI learning assessment to see your profile.',
      cta: 'Take assessment',
      archetype: 'Core Archetype',
      style: 'Learning Style',
      motivation: 'Motivation Trigger',
      strengths: 'Signature Strengths',
      traitSnapshot: 'Trait Snapshot',
      traitNote: 'Scores reflect current tendencies.'
    },
    jp: {
      title: 'AI診断',
      subtitle: 'あなたの認知特性と学習スタイル。',
      emptyTitle: '診断結果がありません',
      emptyBody: 'AI学習診断を実施してプロフィールを表示しましょう。',
      cta: '診断を受ける',
      archetype: 'コアアーキタイプ',
      style: '学習スタイル',
      motivation: 'モチベーションの軸',
      strengths: '強み',
      traitSnapshot: '特性スナップショット',
      traitNote: '現在の傾向を示すスコアです。'
    }
  } as const;

  const t = copy[language];

  const personality = useMemo(() => {
    const type = profile?.personalityType || 'character/openness';
    const map: Record<string, { label: string; sub: string }> = {
      'character/openness': {
        label: 'character/openness',
        sub: language === 'jp'
          ? '開放性が高く、新しい学びを楽しめるタイプ。'
          : 'High openness: curious, imaginative, and exploratory.'
      },
      'バランサー': {
        label: language === 'jp' ? 'バランサー' : 'Balancer',
        sub: language === 'jp'
          ? '安定感と柔軟性のバランスが取れたタイプ。'
          : 'Adaptive and balanced learner.'
      }
    };
    return map[type] || map['character/openness'];
  }, [profile, language]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50/50 px-6 pt-12 pb-20">
        <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-xl text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg mb-6">
            <Brain className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.emptyTitle}</h1>
          <p className="text-slate-500 mt-3 mb-8">{t.emptyBody}</p>
          <button
            type="button"
            onClick={() => onNavigate(ViewState.AI_DIAGNOSIS)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/60 hover:bg-indigo-500 transition"
          >
            {t.cta} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const traitItems = [
    { key: 'openness', label: 'Openness', icon: <Eye className="w-full h-full" />, value: profile.scores.openness },
    { key: 'conscientiousness', label: 'Conscientiousness', icon: <CheckCircle2 className="w-full h-full" />, value: profile.scores.conscientiousness },
    { key: 'extraversion', label: 'Extraversion', icon: <Sparkles className="w-full h-full" />, value: profile.scores.extraversion },
    { key: 'agreeableness', label: 'Agreeableness', icon: <Flame className="w-full h-full" />, value: profile.scores.agreeableness },
    { key: 'neuroticism', label: 'Neuroticism', icon: <Activity className="w-full h-full" />, value: profile.scores.neuroticism }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 px-6 pt-12 pb-20">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-slate-500">{t.subtitle}</p>
        </header>

        <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-6">
          <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-xl">
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-indigo-400">
              {t.archetype}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Eye className="w-8 h-8" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{personality.label}</div>
                <p className="text-slate-500 mt-1">{personality.sub}</p>
              </div>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-2">{t.style}</div>
                <div className="text-sm font-semibold text-slate-800">{profile.learningStyle}</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-2">{t.motivation}</div>
                <div className="text-sm font-semibold text-slate-800">{profile.motivation}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-4">{t.strengths}</div>
            <div className="space-y-4">
              {(profile.aiAdvice?.strengths || []).slice(0, 3).map((item, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                  <p className="text-xs text-slate-500 mt-2">{item.description}</p>
                </div>
              ))}
              {(!profile.aiAdvice?.strengths || profile.aiAdvice.strengths.length === 0) && (
                <div className="text-sm text-slate-500">Analyzing strengths…</div>
              )}
            </div>
          </div>
        </div>

        <section className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{t.traitSnapshot}</div>
              <p className="text-xs text-slate-500 mt-2">{t.traitNote}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {traitItems.map((trait) => (
              <div key={trait.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                    {trait.icon}
                  </div>
                  <div className="text-sm font-semibold text-slate-800">{trait.label}</div>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-2 bg-indigo-500" style={{ width: `${trait.value}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-500">{trait.value}%</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfileDiagnosisView;
