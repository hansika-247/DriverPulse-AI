import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Sparkles, Loader2, History,
  AlertTriangle, BarChart2, Shield, TrendingUp, HelpCircle, Trash2,
} from 'lucide-react';
import { apiSendChat, apiGetChatHistory } from '../api';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';

// ── Suggested prompt pills ──────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: Shield,    label: 'Why is my risk HIGH?',            text: 'Explain why my risk level is HIGH and what I can do to reduce it.' },
  { icon: BarChart2, label: 'Explain my safety score',         text: 'How is my safety score calculated and what factors affect it?' },
  { icon: TrendingUp,label: 'How do I climb the leaderboard?', text: 'What specific steps can I take to improve my leaderboard ranking?' },
  { icon: AlertTriangle, label: 'What are my top flags?',      text: 'Which safety flags appear most often in my history and how can I reduce them?' },
  { icon: HelpCircle, label: 'How does DriverPulse work?',     text: 'Explain how DriverPulse analyses my driving and generates predictions.' },
];

// ── Message bubble renderer ─────────────────────────────────────────────────
function MessageBubble({ msg, isNewAI }) {
  const isUser = msg.sender === 'user';
  const [displayedText, setDisplayedText] = useState(isNewAI ? '' : msg.text);

  useEffect(() => {
    if (!isNewAI) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(msg.text.slice(0, i));
      i += 5; // Reveal chunk
      if (i > msg.text.length) {
        clearInterval(interval);
        setDisplayedText(msg.text);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [msg.text, isNewAI]);

  // Render newlines and bullet points from AI response
  const renderText = (text) =>
    text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <div key={i} className="flex gap-2 mt-1">
            <span className="text-primary mt-0.5 shrink-0">•</span>
            <span>{trimmed.replace(/^[•\-*]\s*/, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <p key={i} className="font-semibold mt-2">{trimmed.slice(2, -2)}</p>;
      }
      return <p key={i} className="mt-1 first:mt-0">{trimmed}</p>;
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'ml-auto flex-row-reverse max-w-[80%]' : 'max-w-[85%]'}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md
          ${isUser
            ? 'bg-gradient-to-br from-slate-600 to-slate-700 border border-white/10 text-white'
            : 'bg-gradient-to-br from-primary to-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
          }`}
      >
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>

      {/* Bubble */}
      <div
        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'glass-panel bg-cardDark/50 border border-white/10 text-textLight'
            : 'glass-panel bg-primary/10 border border-primary/30 text-textLight shadow-[0_4px_20px_rgba(37,99,235,0.1)]'
          }`}
      >
        {renderText(displayedText)}
        {isNewAI && displayedText.length < msg.text.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="inline-block w-2 h-3 bg-primary ml-1 align-middle"
          />
        )}
        <p className="text-[10px] text-textLight/30 mt-2 text-right">
          {msg.time}
        </p>
      </div>
    </motion.div>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex gap-3 max-w-[85%]"
    >
      <motion.div 
        animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 12px rgba(37,99,235,0.4)", "0 0 24px rgba(37,99,235,0.8)", "0 0 12px rgba(37,99,235,0.4)"] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center shrink-0"
      >
        <Sparkles size={15} />
      </motion.div>
      <div className="px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-2 glass-panel shadow-[0_4px_15px_rgba(37,99,235,0.15)]">
        <Loader2 size={15} className="animate-spin text-primary" />
        <span className="text-sm font-mono text-primary/80 animate-pulse">Neural engine reasoning...</span>
      </div>
    </motion.div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dbMsgToUi(m) {
  return [
    { id: m.id + '_q', sender: 'user', text: m.question, time: fmtTime(m.createdAt) },
    { id: m.id + '_a', sender: 'ai',   text: m.response, time: fmtTime(m.createdAt) },
  ];
}

// ── Main component ──────────────────────────────────────────────────────────
const AIAssistant = () => {
  const { driver } = useAuth();
  const { t, selectedLanguage } = useLanguage();

  const WELCOME = {
    id: 'welcome',
    sender: 'ai',
    text: `Hello${driver?.name ? ', ' + driver.name : ''}! I'm Pulse AI, your personal driving assistant.\n\nI have access to your risk predictions, safety scores, trip history, and AI insights. Ask me anything about your driving profile or how to improve your ranking.`,
    time: fmtTime(new Date()),
  };

  const [messages,   setMessages]   = useState([WELCOME]);
  const [input,      setInput]      = useState('');
  const [isTyping,   setIsTyping]   = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error,      setError]      = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);
    apiGetChatHistory()
      .then((res) => {
        const history = res?.data?.history ?? [];
        if (history.length > 0) {
          const uiMsgs = history.flatMap(dbMsgToUi);
          setMessages([WELCOME, ...uiMsgs]);
        }
      })
      .catch(() => {}); // silently ignore — history is non-critical
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (!text.trim() || isTyping) return;
    setError(null);
    const userMsg = { id: Date.now(), sender: 'user', text: text.trim(), time: fmtTime(new Date()) };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await apiSendChat(text.trim(), selectedLanguage);
      const aiText = res?.data?.message?.response ?? 'I could not generate a response. Please try again.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: aiText, time: fmtTime(new Date()), isNew: true },
      ]);
    } catch (err) {
      setError('Failed to reach AI. Please check your connection and try again.');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'I am having trouble connecting right now. Please try again in a moment.',
          time: fmtTime(new Date()),
        },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-5 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Bot size={22} />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-bgDark rounded-full" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('AI Assistant')}</h1>
            <p className="text-xs text-textLight/50 flex items-center gap-1.5">
              <Sparkles size={10} className="text-primary" />
              Powered by Gemini — context-aware driving intelligence
            </p>
          </div>
        </div>

        <button
          onClick={clearChat}
          title="Clear chat"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-textLight/40 hover:text-textLight hover:bg-white/5 border border-white/5 transition-all text-xs"
        >
          <Trash2 size={13} />
          Clear
        </button>
      </motion.div>

      {/* ── Chat window ── */}
      <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl min-h-0">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <MessageBubble key={msg.id} msg={msg} isNewAI={msg.sender === 'ai' && msg.isNew} />
            ))}
          </AnimatePresence>

          {isTyping && (
            <AnimatePresence>
              <TypingIndicator />
            </AnimatePresence>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-2 bg-danger/10 border-t border-danger/20 text-danger text-xs flex items-center gap-2"
            >
              <AlertTriangle size={12} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="p-4 bg-cardDark/50 border-t border-white/10 flex-shrink-0">

          {/* Suggested prompts */}
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p.text)}
                disabled={isTyping}
                className="flex items-center gap-1.5 text-xs bg-black/40 hover:bg-primary/20 hover:border-primary/50 border border-primary/20 shadow-[0_0_10px_rgba(37,99,235,0.1)] hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] rounded-full px-4 py-2 text-primary hover:text-blue-300 transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md"
              >
                <p.icon size={12} className="text-primary animate-pulse" />
                <span className="font-semibold tracking-wide">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Text input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask anything about your driving performance..."
              disabled={isTyping}
              className="w-full bg-bgDark border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-inner disabled:opacity-50 placeholder:text-textLight/30"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)]"
            >
              <Send size={14} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
