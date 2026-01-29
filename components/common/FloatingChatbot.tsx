import React, { useState, useEffect, useRef } from 'react';
import { ChatInterface } from "./ui/ChatInterface";
import { Message } from '../../types';
import { Brain, MessageCircle, X, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { createChatSession, sendMessageStream } from '../../services/geminiService';
import { Chat } from "@google/genai";
import { useLanguage } from '../../context/LanguageContext';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
    h1: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-base font-bold text-slate-900 my-2" {...props} />,
    h2: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="text-sm font-bold text-slate-900 my-2" {...props} />,
    h3: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-sm font-semibold text-slate-800 my-2" {...props} />,
    p: ({ ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p className="my-2 leading-relaxed" {...props} />,
    ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
    ol: ({ ...props }: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
    li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => <li className="leading-relaxed" {...props} />,
    strong: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold text-slate-900" {...props} />,
    em: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <em className="italic text-slate-700" {...props} />,
    code: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[12px] font-mono" {...props} />,
    blockquote: ({ ...props }: React.HTMLAttributes<HTMLQuoteElement>) => <blockquote className="border-l-2 border-slate-200 pl-3 text-slate-600 my-2" {...props} />
};

const SYSTEM_PROMPTS = {
    en: `You are Lumina Concierge, a helpful AI tutor for Unity, Code, and Design.
    Keep answers concise and encouraging. Use analogies for beginners.`,
    jp: `あなたはLumina Conciergeです。Unity、コード、デザインの学習をサポートするAIチューターです。
    回答は簡潔に、励ますようなトーンで。初心者には例え話を多用してください。`
} as const;

export const FloatingChatbot: React.FC = () => {
    const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false); // For minimize specific functionality if needed
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const copy = {
        en: {
            title: 'Lumina AI',
            placeholder: 'Ask about Unity or Code...',
            welcome: "Hi! I'm here to help. Click a term in the text or ask me anything!",
            errorMessage: "Connection error. Please try again."
        },
        jp: {
            title: 'Lumina AI',
            placeholder: 'Unityやコードについて質問...',
            welcome: "こんにちは！学習のサポートをします。わからない用語があれば聞いてくださいね。",
            errorMessage: "接続エラーが発生しました。"
        }
    } as const;
    const t = copy[language];

    // Initialize Chat
    useEffect(() => {
        try {
            const basePrompt = SYSTEM_PROMPTS[language];
            chatSession.current = createChatSession(basePrompt);
        } catch (e) {
            console.warn("Chat init failed");
        }
    }, [language]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    // Handle External Triggers (Glossary)
    useEffect(() => {
        const handleExternalTrigger = (event: any) => {
            const { message, context } = event.detail;
            setIsOpen(true); // Open the chat
            setIsMinimized(false);

            const finalMessage = context 
                ? `[Context: ${context}]\n\nUser Question: ${message}`
                : message;
            
            handleSend(finalMessage);
        };
        window.addEventListener('open-lumina-chat', handleExternalTrigger);
        return () => window.removeEventListener('open-lumina-chat', handleExternalTrigger);
    }, [language]); // Re-bind if language changes

    const handleSend = async (text: string) => {
        // Display logic for context-wrapped messages
        const displayMatch = text.match(/User Question: (.*)/s);
        const displayText = displayMatch ? displayMatch[1] : text;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: displayText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        if (!chatSession.current) {
             setIsLoading(false);
             return;
        }

        try {
            const result = await sendMessageStream(chatSession.current, text);
            let fullResponse = "";
            const botMessageId = (Date.now() + 1).toString();

            setMessages(prev => [...prev, { id: botMessageId, role: 'model', text: "", timestamp: new Date() }]);

            for await (const chunk of result) {
                const chunkText = typeof (chunk as any).text === 'function' ? (chunk as any).text() : (chunk as any).text;
                fullResponse += chunkText;
                setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, text: fullResponse } : msg));
            }
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: t.errorMessage, timestamp: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-transform hover:scale-110 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
                <MessageCircle size={28} />
                {/* Notification Dot */}
                {messages.length === 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300 font-sans">
            {/* Header */}
            <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2">
                    <Brain size={20} />
                    <span className="font-bold">{t.title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-400 rounded-xl flex items-center justify-center mb-3">
                            <Brain size={24} />
                        </div>
                        <p className="text-sm">{t.welcome}</p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                            ${msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-bl-none'}
                        `}>
                            {msg.role === 'model' ? (
                                <div className="prose prose-sm prose-slate max-w-none">
                                    <ReactMarkdown components={markdownComponents}>
                                        {msg.text || ''}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const input = form.elements.namedItem('message') as HTMLInputElement;
                        if (input.value.trim()) {
                            handleSend(input.value);
                            input.value = '';
                        }
                    }}
                    className="flex gap-2"
                >
                    <input
                        name="message"
                        type="text"
                        placeholder={t.placeholder}
                        className="flex-1 bg-slate-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <MessageCircle size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};
