import React from 'react';
import { DiagnosisResult } from '../types';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    PieChart, Pie, Cell, Tooltip
} from 'recharts';
import { CheckCircle2, AlertTriangle, Lightbulb, Clock, RefreshCcw, Briefcase, Zap } from 'lucide-react';

interface ResultScreenProps {
    result: DiagnosisResult;
    onRetake: () => void;
}

const COLORS = ['#60a5fa', '#c084fc', '#34d399', '#f472b6', '#fbbf24'];

const RadarShape: React.FC<any> = ({ points, stroke, fill, strokeWidth, fillOpacity }) => {
    if (!points || points.length === 0) return null;
    const pointString = points.map((point: { x: number; y: number }) => `${point.x},${point.y}`).join(' ');
    return (
        <polygon
            className="radar-grow"
            points={pointString}
            stroke={stroke}
            fill={fill}
            strokeWidth={strokeWidth}
            fillOpacity={fillOpacity}
        />
    );
};

const ResultScreen: React.FC<ResultScreenProps> = ({ result, onRetake }) => {
    return (
        <div className="min-h-screen py-12 px-4 md:px-6 max-w-7xl mx-auto space-y-8 animate-[fadeIn_0.8s_ease-out] text-slate-900">
            
            {/* Header Section */}
            <header className="text-center space-y-4 mb-12">
                <div className="inline-block px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold tracking-wide uppercase mb-2">
                    Analysis Complete
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-2">
                    {result.archetypeName}
                </h1>
                <p className="text-xl md:text-2xl gradient-text font-medium">
                    {result.tagline}
                </p>
                <p className="text-slate-600 max-w-3xl mx-auto mt-6 leading-relaxed">
                    {result.summary}
                </p>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Radar Chart: Traits */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-1 flex flex-col items-center justify-center min-h-[400px] shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Zap size={20} className="text-yellow-400" />
                        能力パラメータ
                    </h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={result.traits}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Score"
                                    dataKey="A"
                                    stroke="#818cf8"
                                    strokeWidth={3}
                                    fill="#818cf8"
                                    fillOpacity={0.4}
                                    isAnimationActive={false}
                                    shape={(props) => <RadarShape {...props} />}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart: Time Allocation */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-1 flex flex-col items-center justify-center min-h-[400px] shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-green-400" />
                        推奨時間配分
                    </h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={result.studyAllocation}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    isAnimationActive={true}
                                    animationDuration={1500}
                                    animationBegin={200}
                                    animationEasing="ease-out"
                                >
                                    {result.studyAllocation.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                                    itemStyle={{ color: '#0f172a' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-4">
                        {result.studyAllocation.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-slate-600">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.name}: {entry.value}%
                            </div>
                        ))}
                    </div>
                </div>

                {/* Personality Insight */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-1 flex flex-col justify-center shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Lightbulb size={20} className="text-purple-400" />
                        性格・日常特性
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        {result.personalityInsight}
                    </p>
                    <div className="mt-6 pt-6 border-t border-slate-200">
                         <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Briefcase size={16} className="text-blue-400"/> 推奨ツール
                         </h4>
                         <div className="flex flex-wrap gap-2">
                            {result.tools.map((tool, idx) => (
                                <span key={idx} className="px-3 py-1 bg-slate-100 rounded-lg text-xs text-blue-600 border border-slate-200">
                                    {tool}
                                </span>
                            ))}
                         </div>
                    </div>
                </div>

                {/* Detailed Analysis Row */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 shadow-md">
                     <h3 className="text-xl font-bold text-slate-900 mb-6">学習メソッド & ルーティン</h3>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-blue-400 font-semibold mb-2">推奨学習法</h4>
                            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                {result.recommendedMethod}
                            </p>
                            <h4 className="text-purple-400 font-semibold mb-2">デイリールーティン</h4>
                             <p className="text-slate-600 text-sm leading-relaxed">
                                {result.dailyRoutineAdvice}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                                <h4 className="text-green-500 font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 size={18}/> Strengths
                                </h4>
                                <ul className="space-y-1">
                                    {result.strengths.map((s, i) => (
                                        <li key={i} className="text-slate-700 text-sm">• {s}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                <h4 className="text-red-500 font-semibold mb-2 flex items-center gap-2">
                                    <AlertTriangle size={18}/> Weaknesses
                                </h4>
                                <ul className="space-y-1">
                                    {result.weaknesses.map((w, i) => (
                                        <li key={i} className="text-slate-700 text-sm">• {w}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                     </div>
                </div>
                 
                 {/* Action Panel */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-1 flex flex-col items-center justify-center text-center shadow-md">
                    <p className="text-slate-600 mb-6 text-sm">
                        この診断結果は今のあなたの状態を表しています。
                        環境や目標が変われば、最適なスタイルも変化します。
                    </p>
                    <button 
                        onClick={onRetake}
                        className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        <RefreshCcw size={18} />
                        診断をやり直す
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ResultScreen;
