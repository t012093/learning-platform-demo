import React, { useEffect } from 'react';
import { Calendar, CheckCircle2, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { ViewState } from '../../../../types';
import { useLanguage } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../context/ThemeContext';

interface ProfileHistoryViewProps {
  onNavigate: (view: ViewState) => void;
}

const ProfileHistoryView: React.FC<ProfileHistoryViewProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('default');
  }, [setTheme]);

  const copy = {
    en: {
      title: 'Learning History',
      subtitle: 'A timeline of your recent learning activities.',
      cta: 'Start a new lesson'
    },
    jp: {
      title: '学習履歴',
      subtitle: '最近の学習アクティビティのタイムライン。',
      cta: '新しい学習を始める'
    }
  } as const;

  const t = copy[language];

  const items = [
    {
      title: language === 'jp' ? 'AI学習診断を完了' : 'Completed AI Diagnosis',
      description: language === 'jp' ? 'character/openness が確定' : 'character/openness confirmed',
      icon: <CheckCircle2 className="w-full h-full" />,
      date: '2026.01.30'
    },
    {
      title: language === 'jp' ? 'AIコースを生成' : 'Generated an AI course',
      description: language === 'jp' ? 'Unity x AI：次世代ゲーム開発' : 'Unity x AI: Future of Game Dev',
      icon: <Sparkles className="w-full h-full" />,
      date: '2026.01.29'
    },
    {
      title: language === 'jp' ? 'レッスンを開始' : 'Started a lesson',
      description: language === 'jp' ? 'Pythonの核心：変数とメモリ' : 'Python Core: Variables & Memory',
      icon: <BookOpen className="w-full h-full" />,
      date: '2026.01.28'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 px-6 pt-12 pb-20">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-slate-500">{t.subtitle}</p>
        </header>

        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-xl">
          <div className="space-y-6">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-xs text-slate-400 uppercase tracking-[0.25em]">
                    <Calendar size={14} />
                    {item.date}
                  </div>
                  <div className="text-lg font-semibold text-slate-800 mt-2">{item.title}</div>
                  <p className="text-sm text-slate-500 mt-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onNavigate(ViewState.LEARNING_HUB)}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition"
          >
            {t.cta} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHistoryView;
