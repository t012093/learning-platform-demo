import React from 'react';
import { MessageCircle, User, Bot } from 'lucide-react';
import { DialogueBlock } from '../../../../types';
import { useLanguage } from '../../../../../context/LanguageContext';

interface DialoguePageProps {
  block: DialogueBlock;
}

const DialoguePage: React.FC<DialoguePageProps> = ({ block }) => {
  const { language } = useLanguage();
  const copy = {
    en: {
      title: 'Interactive Scoping',
      subtitle: 'Q&A Session with Rise Path'
    },
    jp: {
      title: 'インタラクティブ・スコーピング',
      subtitle: 'Rise PathとのQ&Aセッション'
    }
  } as const;
  const t = copy[language];

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-8 mb-12">
        <div className="w-12 h-12 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center text-indigo-600">
          <MessageCircle size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.title}</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.subtitle}</p>
        </div>
      </div>
      
      <div className="mb-8 space-y-4 max-w-2xl mx-auto py-4">
        {block.lines.map((line, idx) => (
          <div key={idx} className={`flex gap-4 ${line.speaker === 'User' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${
              line.speaker === 'User' ? 'bg-slate-900 text-white' : 'bg-white text-indigo-600 border border-indigo-100'
            }`}>
              {line.speaker === 'User' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className={`p-5 rounded-3xl text-base leading-relaxed shadow-sm max-w-[80%] ${
              line.speaker === 'User' 
                ? 'bg-slate-900 text-white rounded-tr-sm' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
            }`}>
              {line.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DialoguePage;
