import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Brain,
  Compass,
  Flame,
  HeartPulse,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Wand2
} from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { ViewState } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

const MissionControlDashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { setTheme } = useTheme();
  const { language } = useLanguage();
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setTheme('default');
  }, [setTheme]);

  useEffect(() => {
    setChartReady(true);
  }, []);

  const copy = {
    en: {
      heroKicker: 'Mission Control',
      heroTitle: 'Welcome back, Alex',
      heroSubtitle: 'Pick a lane, ship a win, and let AI do the heavy lifting.',
      streak: '3 day streak',
      weeklyHours: '2.5h this week',
      level: 'Level 12',
      primaryKicker: 'Now Playing',
      primaryTitle: 'Vibe Coding: The Engine',
      primaryDescription: 'Master OSS workflows with Codex as your co-pilot. You are 75% through Chapter 3.',
      primaryMeta: 'Chapter 3 • 25 min',
      primaryCta: 'Resume chapter',
      quickActions: 'Quick Actions',
      actionDiagnosisTitle: 'AI Learning Diagnosis',
      actionDiagnosisBody: '5-question demo assessment',
      actionGeneratorTitle: 'AI Course Generator',
      actionGeneratorBody: 'Turn any topic into a path',
      actionHubTitle: 'Learning Hub',
      actionHubBody: 'Browse themed experiences',
      actionProfileTitle: 'Profile Passport',
      actionProfileBody: 'See your strengths',
      conditionTitle: 'Learning Condition',
      conditionSubtitle: 'Keep your pace sustainable.',
      conditionMeta: 'Last 7 days average',
      conditionItems: [
        { label: 'Focus', value: '82%', percent: 82, tone: 'indigo', note: 'Strong attention window' },
        { label: 'Energy', value: '64%', percent: 64, tone: 'emerald', note: 'Afternoons dip a bit' },
        { label: 'Sleep', value: '7h 10m', percent: 78, tone: 'amber', note: 'Average per night' }
      ],
      focusStack: 'Focus Stack',
      focusItems: [
        'Run the demo assessment',
        'Generate a 3-week learning path',
        'Ask Lumina for next steps'
      ],
      gamificationTitle: 'Level Up',
      gamificationSubtitle: 'Complete one quest to gain +40 XP.',
      gamificationMeta: 'Next reward at 500 XP',
      gamificationLevelLabel: 'Level',
      gamificationLevelValue: '12',
      gamificationXpLabel: 'XP Progress',
      gamificationXpValue: 340,
      gamificationXpGoal: 500,
      gamificationQuestTitle: 'Daily Quest',
      gamificationQuestBody: '15 min focus block',
      gamificationQuestReward: '+40 XP',
      gamificationBadges: ['Streak 3', 'First Build', 'AI Explorer'],
      momentumTitle: 'Momentum',
      momentumMeta: 'Total 2.5 hours this week',
      momentumCardTitle: 'Weekly goal',
      momentumCardValue: '75%',
      momentumCardBody: '3 sessions to hit 4h',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    jp: {
      heroKicker: 'ミッションコントロール',
      heroTitle: 'おかえりなさい、Alex',
      heroSubtitle: 'レーンを決めて、成果を出そう。重い作業はAIに任せる。',
      streak: '3日連続',
      weeklyHours: '今週 2.5h',
      level: 'レベル 12',
      primaryKicker: '再開ポイント',
      primaryTitle: 'Vibe Coding: The Engine',
      primaryDescription: 'Codexを相棒にOSSワークフローを攻略。第3章は75%完了。',
      primaryMeta: '第3章 • 25分',
      primaryCta: '続きから再開',
      quickActions: 'クイックアクション',
      actionDiagnosisTitle: 'AI学習診断',
      actionDiagnosisBody: '5問のデモ診断',
      actionGeneratorTitle: 'AIコース生成',
      actionGeneratorBody: '任意トピックを学習パス化',
      actionHubTitle: 'ラーニングハブ',
      actionHubBody: 'テーマ別体験を一覧',
      actionProfileTitle: 'プロフィール',
      actionProfileBody: '強みを可視化',
      conditionTitle: '学習コンディション',
      conditionSubtitle: '無理なく続けるための指標',
      conditionMeta: '直近7日平均',
      conditionItems: [
        { label: '集中度', value: '82%', percent: 82, tone: 'indigo', note: '集中の持続が良好' },
        { label: 'エネルギー', value: '64%', percent: 64, tone: 'emerald', note: '午後に少し低下' },
        { label: '睡眠', value: '7h 10m', percent: 78, tone: 'amber', note: '平均 7時間10分' }
      ],
      focusStack: 'フォーカススタック',
      focusItems: [
        'デモ診断を実行',
        '3週間の学習パスを生成',
        'Luminaに次の一手を相談'
      ],
      gamificationTitle: 'レベルアップ',
      gamificationSubtitle: 'クエスト達成で +40 XP',
      gamificationMeta: '次の報酬まで 500 XP',
      gamificationLevelLabel: 'レベル',
      gamificationLevelValue: '12',
      gamificationXpLabel: 'XP 進捗',
      gamificationXpValue: 340,
      gamificationXpGoal: 500,
      gamificationQuestTitle: 'デイリークエスト',
      gamificationQuestBody: '集中15分チャレンジ',
      gamificationQuestReward: '+40 XP',
      gamificationBadges: ['連続3日', '初ビルド', 'AIエクスプローラー'],
      momentumTitle: 'モメンタム',
      momentumMeta: '今週合計 2.5 時間',
      momentumCardTitle: '週間ゴール',
      momentumCardValue: '75%',
      momentumCardBody: 'あと3セッションで4h達成',
      days: ['月', '火', '水', '木', '金', '土', '日']
    }
  } as const;

  const t = copy[language];

  const activityData = useMemo(() => (
    t.days.map((day, index) => ({
      day,
      count: [12, 18, 15, 25, 20, 8, 30][index]
    }))
  ), [t.days]);
  const conditionToneMap = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500'
  } as const;
  const xpProgress = Math.min(100, Math.round((t.gamificationXpValue / t.gamificationXpGoal) * 100));
  const xpProgressStyle = { ['--progress' as any]: `${xpProgress}%` } as React.CSSProperties;
  const badgeIcons = [Flame, Trophy, Sparkles];

  return (
    <div className="relative overflow-hidden p-6 md:p-12 max-w-[1200px] mx-auto min-h-screen space-y-10">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-indigo-400/40 via-purple-300/20 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-[360px] w-[360px] rounded-full bg-gradient-to-tr from-emerald-200/40 via-sky-200/20 to-transparent blur-[120px]" />

      <header className="relative z-10 flex flex-col gap-6 dashboard-fade" style={{ animationDelay: '40ms' }}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t.heroKicker}</p>
            <h1 className="font-serif text-4xl md:text-5xl text-slate-900 mt-2">{t.heroTitle}</h1>
            <p className="text-slate-500 mt-3 max-w-xl">{t.heroSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatPill icon={Flame} label={t.streak} tone="orange" delay="120ms" />
            <StatPill icon={Target} label={t.weeklyHours} tone="indigo" delay="200ms" />
            <StatPill icon={Trophy} label={t.level} tone="emerald" delay="280ms" />
          </div>
        </div>
      </header>

      <section className="grid lg:grid-cols-[1.15fr,0.85fr] gap-6">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-7 md:p-8 shadow-xl dashboard-fade-float" style={{ animationDelay: '120ms' }}>
          <div className="pointer-events-none absolute -top-16 right-0 h-64 w-64 rounded-full bg-purple-500/30 blur-[90px] dashboard-glow" />
          <div className="pointer-events-none absolute bottom-0 left-10 h-44 w-44 rounded-full bg-emerald-400/20 blur-[80px] dashboard-glow" />
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-300">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{t.primaryKicker}</span>
              <span>{t.primaryMeta}</span>
            </div>
            <div>
              <h2 className="font-serif text-2xl md:text-3xl">{t.primaryTitle}</h2>
              <p className="text-slate-300 mt-3 text-sm md:text-base max-w-xl">{t.primaryDescription}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(ViewState.VIBE_PATH)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-slate-900 font-semibold shadow-lg shadow-white/20 hover:bg-purple-50 transition"
            >
              {t.primaryCta} <ArrowUpRight size={18} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white/80 backdrop-blur p-7 md:p-8 shadow-sm flex flex-col gap-6 dashboard-fade" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.conditionTitle}</p>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mt-2">{t.conditionSubtitle}</h3>
              <p className="text-sm text-slate-500 mt-2">{t.conditionMeta}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HeartPulse size={22} />
            </div>
          </div>
          <div className="space-y-4">
            {t.conditionItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-800">{item.value}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${conditionToneMap[item.tone]} dashboard-progress`}
                    style={{ ['--progress' as any]: `${item.percent}%` } as React.CSSProperties}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-100 bg-white/80 backdrop-blur p-6 shadow-sm dashboard-fade" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">{t.quickActions}</h3>
          </div>
          <div className="grid gap-3">
            <ActionCard
              title={t.actionDiagnosisTitle}
              description={t.actionDiagnosisBody}
              icon={Brain}
              tone="indigo"
              onClick={() => onNavigate(ViewState.AI_DIAGNOSIS)}
            />
            <ActionCard
              title={t.actionGeneratorTitle}
              description={t.actionGeneratorBody}
              icon={Wand2}
              tone="emerald"
              onClick={() => onNavigate(ViewState.COURSE_GENERATOR)}
            />
            <ActionCard
              title={t.actionHubTitle}
              description={t.actionHubBody}
              icon={Compass}
              tone="amber"
              onClick={() => onNavigate(ViewState.LEARNING_HUB)}
            />
            <ActionCard
              title={t.actionProfileTitle}
              description={t.actionProfileBody}
              icon={Sparkles}
              tone="rose"
              onClick={() => onNavigate(ViewState.PROFILE)}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white/80 backdrop-blur p-6 shadow-sm dashboard-fade" style={{ animationDelay: '320ms' }}>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">{t.focusStack}</h3>
          <ul className="space-y-3">
            {t.focusItems.map((item) => (
              <li key={item} className="flex items-center gap-3 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/90 backdrop-blur p-8 shadow-sm dashboard-fade" style={{ animationDelay: '380ms' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.gamificationTitle}</p>
            <h3 className="text-2xl font-semibold text-slate-900 mt-2">
              {t.gamificationLevelLabel} {t.gamificationLevelValue}
            </h3>
            <p className="text-sm text-slate-500 mt-2">{t.gamificationMeta}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {t.gamificationBadges.map((badge, index) => (
              <BadgePill
                key={badge}
                label={badge}
                icon={badgeIcons[index % badgeIcons.length]}
                style={{ animationDelay: `${index * 80 + 120}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-[1.1fr,0.9fr] gap-6 mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{t.gamificationXpLabel}</span>
              <span className="font-semibold text-slate-800">
                {t.gamificationXpValue} / {t.gamificationXpGoal}
              </span>
            </div>
            <div className="mt-3 h-3 w-full rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-indigo-500 dashboard-progress" style={xpProgressStyle} />
            </div>
            <p className="text-xs text-slate-500 mt-2">{t.gamificationSubtitle}</p>
          </div>
          <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Zap size={14} />
              {t.gamificationQuestTitle}
            </div>
            <div className="text-lg font-semibold">{t.gamificationQuestBody}</div>
            <div className="text-sm text-emerald-300 font-semibold">{t.gamificationQuestReward}</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm dashboard-fade" style={{ animationDelay: '460ms' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
          <h3 className="text-slate-800 font-bold">{t.momentumTitle}</h3>
          <span className="text-sm text-slate-400">{t.momentumMeta}</span>
        </div>
        <div className="grid md:grid-cols-[1fr,220px] gap-6 items-stretch">
          <div className="h-[140px] w-full min-w-[240px]">
            {chartReady && (
              <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={120}>
                <LineChart data={activityData}>
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#64748b"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#cbd5e1', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#6366f1' }}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: 'white' }}
                    itemStyle={{ color: 'white' }}
                    cursor={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col justify-between">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.momentumCardTitle}</div>
            <div className="text-3xl font-bold">{t.momentumCardValue}</div>
            <div className="text-sm text-slate-300">{t.momentumCardBody}</div>
          </div>
        </div>
      </section>
    </div>
  );
};

const StatPill = ({
  icon: Icon,
  label,
  tone,
  delay
}: {
  icon: any;
  label: string;
  tone: 'orange' | 'indigo' | 'emerald';
  delay?: string;
}) => {
  const toneMap = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold dashboard-pop ${toneMap[tone]}`}
      style={delay ? { animationDelay: delay } : undefined}
    >
      <Icon size={16} />
      {label}
    </div>
  );
};

const ActionCard = ({
  title,
  description,
  icon: Icon,
  tone,
  onClick
}: {
  title: string;
  description: string;
  icon: any;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose';
  onClick: () => void;
}) => {
  const toneMap = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${toneMap[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <ArrowUpRight size={18} className="text-slate-400 group-hover:text-slate-600 transition" />
    </button>
  );
};

const BadgePill = ({
  label,
  icon: Icon,
  style
}: {
  label: string;
  icon: any;
  style?: React.CSSProperties;
}) => (
  <div
    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dashboard-pop"
    style={style}
  >
    <Icon size={14} className="text-slate-500" />
    {label}
  </div>
);

export default MissionControlDashboard;
