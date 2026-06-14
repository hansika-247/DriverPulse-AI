import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "Hello! I'm your Driver Pulse AI Assistant. I can help you analyze your driving performance, understand flagged events, or suggest ways to improve your safety score. What would you like to know?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestedPrompts = [
    "Why was my trip flagged?",
    "How can I improve my safety score?",
    "Show my riskiest trip."
  ];

  const handleSend = (text) => {
    if (!text.trim()) return;
    
    // Add user message
    const newMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let responseText = "I'm analyzing your data. This is a simulated response based on your driving history.";
      if (text.includes("flagged")) {
        responseText = "Your last trip was flagged for 'Hard Braking' at 10:45 AM. The telemetry shows a sudden deceleration from 65mph to 20mph in under 3 seconds. Try maintaining a larger following distance to avoid sudden stops.";
      } else if (text.includes("improve")) {
        responseText = "To improve your safety score, focus on smooth acceleration and deceleration. Your score currently sits at 92/100, which is excellent. Reducing your average speed by 2mph in residential zones could boost it to 95.";
      } else if (text.includes("riskiest")) {
        responseText = "Your riskiest trip was TRP-1038 on Monday. It had 4 flagged events, mostly related to tailgating and one instance of hard cornering. Your safety score for that trip was 78/100.";
      }

      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: responseText }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6 flex-shrink-0"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          <Bot size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pulse AI Assistant</h1>
          <p className="text-sm text-textLight/60">Powered by advanced telemetry analysis</p>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden border border-white/10">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex gap-4 max-w-[80%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-cardDark border border-white/10 text-textLight' : 'bg-primary text-white'}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Sparkles size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-cardDark border border-white/10' : 'bg-primary/10 border border-primary/20'}`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 max-w-[80%]"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-sm text-textLight/70">Analyzing telemetry data...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-cardDark/50 border-t border-white/10">
          {/* Suggested Prompts */}
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestedPrompts.map((prompt, i) => (
              <button 
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-textLight/70 hover:text-textLight transition-colors whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
              placeholder="Ask me anything about your driving performance..." 
              className="w-full bg-bgDark border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
            />
            <button 
              onClick={() => handleSend(inputValue)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-colors"
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
