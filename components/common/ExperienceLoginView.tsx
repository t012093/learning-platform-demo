import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight, Fingerprint, Mail, ShieldCheck, Terminal, UserCircle } from 'lucide-react';
import { adachiService } from '../../services/adachiService';

interface LoginViewProps {
    onLoginSuccess: () => void;
}

const ExperienceLoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const { language } = useLanguage();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const copy = {
        en: {
            title: 'System Authentication',
            subtitle: 'Initialize your neural link to begin.',
            emailLabel: 'Identity (Email)',
            guestCta: 'Access as Guest',
            guestDesc: 'Start exploring without persistent data.',
            loginCta: 'Verify Identity',
            error: 'Authentication failed. Please check your credentials.',
            placeholder: 'identity@risepath.system'
        },
        jp: {
            title: 'システム認証',
            subtitle: '学習を開始するには、ニューラルリンクを初期化してください。',
            emailLabel: 'ID (メールアドレス)',
            guestCta: 'ゲストとしてアクセス',
            guestDesc: 'データを保存せずに探索を開始します。',
            loginCta: 'アイデンティティを確認',
            error: '認証に失敗しました。情報を確認してください。',
            placeholder: 'identity@risepath.system'
        }
    } as const;

    const t = copy[language];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            // Mock login logic using adachiService
            const result = await adachiService.login(email || "guest@risepath.system", "password");
            if (result) {
                onLoginSuccess();
            } else {
                setError(t.error);
            }
        } catch (err) {
            setError(t.error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = () => {
        setIsLoading(true);
        // Simulate guest initialization
        setTimeout(() => {
            onLoginSuccess();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
            
            <div className="relative w-full max-w-md p-1 px-6">
                <div className="absolute inset-0 bg-rose-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 animate-pulse">
                            <Fingerprint className="w-10 h-10 text-rose-500" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-2 uppercase font-mono">{t.title}</h1>
                        <p className="text-white/40 text-sm">{t.subtitle}</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2 ml-4">
                                {t.emailLabel}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t.placeholder}
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-white/10"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                                [ERROR]: {error}
                            </div>
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full group bg-white text-black py-4 rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-all disabled:opacity-50 shadow-xl shadow-white/5"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    {t.loginCta}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8 text-white/10">
                        <div className="h-[1px] flex-1 bg-current" />
                        <span className="text-[10px] font-mono uppercase tracking-widest">OR</span>
                        <div className="h-[1px] flex-1 bg-current" />
                    </div>

                    {/* Guest Mode */}
                    <button
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                        className="w-full group bg-white/5 border border-white/10 text-white p-6 rounded-[1.5rem] text-left hover:bg-white/10 transition-all flex items-center gap-4"
                    >
                        <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center text-white/60 group-hover:text-rose-400 transition-colors">
                            <UserCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold uppercase tracking-wider">{t.guestCta}</h3>
                            <p className="text-[10px] text-white/30 font-mono">{t.guestDesc}</p>
                        </div>
                        <Terminal className="w-4 h-4 text-white/20" />
                    </button>
                </div>

                {/* System Message */}
                <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">
                        <ShieldCheck className="w-3 h-3 text-emerald-500/50" />
                        Secure Neural Channel: Active
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExperienceLoginView;
