import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, User, RefreshCw, ChevronRight } from 'lucide-react';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { Language } from '../../types/car';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

interface AIConsultantChatbotProps {
  language: Language;
  onOpenCarCheck?: (plate?: string) => void;
  onOpenCustomsCalc?: () => void;
  onOpenParts?: () => void;
}

const QUICK_PROMPTS = [
  'Когда работает авторынок РИОМ-АВТО?',
  'Сколько стоит растаможка электромобиля?',
  'Где найти запчасти на Кудайбергене?',
  'Как проверить авто по базе CarCheck KG?',
];

export const AIConsultantChatbot: React.FC<AIConsultantChatbotProps> = ({
  language,
  onOpenCarCheck,
  onOpenCustomsCalc,
  onOpenParts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: language === 'kg'
        ? 'Саламатсызбы! Мен KGzone авто-кеңешчисимин. Кыргызстандагы автобазар, РИОМ-АВТО, Кудайбергендеги тетиктер жана CarCheck текшерүү боюнча суроолоруңузга жооп берүүгө даярмын!'
        : 'Салам! Я виртуальный автоконсультант KGzone. Подскажу по ценам на авто в Кыргызстане, графику работы авторынков (РИОМ-АВТО, Жапалак), запчастям на рынке Кудайберген, растаможке и проверке CarCheck. Чем могу помочь?',
      time: 'Сейчас',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-5).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const response = await fetch('/api/ai/consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
        }),
      });

      const data = await response.json();
      const botReply = data.reply || 'Спасибо за вопрос! Попробуйте повторить запрос.';

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'Авторынок РИОМ-АВТО работает в субботу и воскресенье. Рынок запчастей Кудайберген открыт со вторника по воскресенье. Можете воспользоваться поиском или калькулятором на сайте!',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating CTA Toggle Button */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-[#C8102E] hover:bg-[#a60d26] text-white rounded-full shadow-2xl transition-all transform hover:scale-105 cursor-pointer group"
            title="Автоэксперт KGzone AI"
          >
            <div className="relative">
              <Bot size={22} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-[#C8102E]"></span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold leading-tight flex items-center gap-1">
                <span>AI Автоэксперт</span>
                <Sparkles size={12} className="text-amber-300" />
              </div>
              <div className="text-[10px] text-red-100 font-medium">Онлайн консультация</div>
            </div>
          </button>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-full sm:w-96 max-w-[calc(100vw-2.5rem)] h-[540px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C8102E] flex items-center justify-center text-white shadow-xs">
                <KochkorMuyuzIcon size={18} color="#FFFFFF" />
              </div>
              <div>
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>KGzone Автоконсультант</span>
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">AI</span>
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Онлайн · Эксперт по авторынку КР</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 flex-wrap text-[11px]">
            {onOpenCarCheck && (
              <button
                onClick={() => onOpenCarCheck('01 KG 777 AAA')}
                className="whitespace-nowrap px-2 py-1 bg-white hover:bg-slate-200 rounded text-slate-700 font-medium border border-slate-200 cursor-pointer"
              >
                🔍 CarCheck
              </button>
            )}
            {onOpenCustomsCalc && (
              <button
                onClick={onOpenCustomsCalc}
                className="whitespace-nowrap px-2 py-1 bg-white hover:bg-slate-200 rounded text-slate-700 font-medium border border-slate-200 cursor-pointer"
              >
                🧮 Растаможка
              </button>
            )}
            {onOpenParts && (
              <button
                onClick={onOpenParts}
                className="whitespace-nowrap px-2 py-1 bg-white hover:bg-slate-200 rounded text-slate-700 font-medium border border-slate-200 cursor-pointer"
              >
                ⚙️ Кудайберген
              </button>
            )}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-[#C8102E] text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    К
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl p-3 leading-relaxed shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-[#C8102E] text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      m.sender === 'user' ? 'text-red-200' : 'text-slate-400'
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User size={12} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
                <div className="w-6 h-6 rounded-full bg-[#C8102E] text-white flex items-center justify-center font-bold text-[10px]">
                  К
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-2xs">
                  <RefreshCw size={12} className="animate-spin text-[#C8102E]" />
                  <span>Печатает ответ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5 flex-wrap text-[11px]">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спросите об авто, запчастях, растаможке..."
              disabled={loading}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-[#C8102E] hover:bg-[#a60d26] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
