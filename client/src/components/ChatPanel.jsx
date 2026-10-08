import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Sparkles, MessageSquare } from 'lucide-react';
import { sounds } from '../services/soundEffects';

const QUICK_EMOJIS = ['🔥', '⚽', '🍿', '🚀', '❤️', '😂', '👏', '🎉', '👀', '💯'];

export function ChatPanel({ 
  messages = [], 
  onSendMessage, 
  onSendReaction,
  canChat = true 
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    sounds.playPop();
  };

  const handleAddEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    onSendReaction(emoji);
    sounds.playReaction();
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f18]/90 rounded-md border border-zinc-800 shadow-lg overflow-hidden">
      
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-zinc-100" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Canlı Oda Sohbeti
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full font-mono">
          {messages.filter(m => !m.isSystem).length} mesaj
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-1.5">
                <span className="text-[11px] bg-purple-950/40 text-zinc-100 border border-zinc-700 px-3 py-1 rounded-full text-center max-w-[90%]">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-2.5 group">
              <span className="text-lg shrink-0 mt-0.5">{msg.avatar || '🎮'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span 
                    className="text-xs font-bold leading-none truncate"
                    style={{ color: msg.color || '#8b5cf6' }}
                  >
                    {msg.sender}
                  </span>
                  <span className="text-[10px] text-zinc-500 leading-none font-mono">
                    {msg.timestamp}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-200 bg-white/5 border border-zinc-800 rounded-md px-3 py-2 rounded-tl-none break-words leading-relaxed group-hover:border-zinc-800 transition">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Tray */}
      {canChat && (
        <div className="px-3 py-1.5 bg-black/40 border-t border-zinc-800 flex items-center gap-1 overflow-x-auto">
          <span className="text-[10px] text-zinc-500 shrink-0 mr-1 flex items-center gap-0.5">
            <Sparkles className="w-3 h-3 text-zinc-100" /> Hızlı:
          </span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="hover:scale-125 transition active:scale-95 text-base px-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-white/[0.02] border-t border-zinc-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          disabled={!canChat}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={canChat ? "Mesajını yaz veya emoji gönder..." : "Yönetici mesaj gönderme izninizi kapattı."}
          className="flex-1 bg-white/5 border border-zinc-800 rounded-md px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || !canChat}
          className="p-2.5 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white transition shadow-md disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
