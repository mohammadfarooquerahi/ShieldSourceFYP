// components/ChatPanel.jsx
// Reusable real-time chat panel for incident communication
// Used in both ExpertDashboard and UserDashboard
// Auto-polls every 5 seconds for new messages

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export default function ChatPanel({ incidentId, incidentTitle }) {
  const { user }                  = useAuth();
  const [messages,   setMessages] = useState([]);
  const [inputText,  setInput]    = useState('');
  const [sending,    setSending]  = useState(false);
  const [loading,    setLoading]  = useState(true);
  const [error,      setError]    = useState('');
  const bottomRef                 = useRef(null);
  const pollRef                   = useRef(null);

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.get(`/chat/${incidentId}`);
      setMessages(res.data.messages || []);
      setError('');
    } catch (err) {
      setError('Failed to load messages.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // ── Auto-poll every 5 seconds ───────────────────────────────────────────────
  useEffect(() => {
    if (!incidentId) return;
    fetchMessages(true);
    pollRef.current = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(pollRef.current);
  }, [incidentId]);

  // ── Scroll to bottom when new messages arrive ───────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    const text = inputText.trim();
    setInput('');

    // Optimistic UI — add message immediately before server confirms
    const tempMsg = {
      id:          `temp-${Date.now()}`,
      sender_id:   user.id,
      sender_name: user.name,
      sender_role: user.role,
      message:     text,
      created_at:  new Date().toISOString(),
      temp:        true,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await api.post(`/chat/${incidentId}`, { message: text });
      // Replace temp message with real one from server
      setMessages(prev =>
        prev.map(m => m.temp ? res.data.message : m)
      );
    } catch (err) {
      // Remove temp message on failure
      setMessages(prev => prev.filter(m => !m.temp));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  // Send on Enter (Shift+Enter = new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Role badge ──────────────────────────────────────────────────────────────
  const getRoleBadge = (role) => {
    if (role === 'expert') return { label: 'Expert', color: 'bg-blue-500' };
    if (role === 'admin')  return { label: 'Admin',  color: 'bg-purple-500' };
    return                         { label: 'Client', color: 'bg-emerald-500' };
  };

  // ── Format timestamp ────────────────────────────────────────────────────────
  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (ts) => {
    const d   = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ── Group messages by date ──────────────────────────────────────────────────
  const grouped = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {});

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden"
         style={{ height: '480px' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                        flex items-center justify-center text-white text-sm font-bold shrink-0">
          💬
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {incidentTitle || 'Incident Chat'}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-slate-400 text-xs">Live — refreshes every 5s</p>
          </div>
        </div>
        <span className="text-slate-500 text-xs shrink-0">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
           style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>

        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading messages...</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl">
              💬
            </div>
            <p className="text-slate-500 text-sm font-medium">No messages yet</p>
            <p className="text-slate-600 text-xs text-center max-w-xs">
              Start the conversation. Messages are visible to both the client and the assigned expert.
            </p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-600 text-xs px-2 shrink-0">
                {formatDate(msgs[0].created_at)}
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {msgs.map((msg, idx) => {
              const isMe    = msg.sender_id === user?.id;
              const badge   = getRoleBadge(msg.sender_role);
              const prevMsg = idx > 0 ? msgs[idx - 1] : null;
              const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id;

              return (
                <div key={msg.id}
                     className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col max-w-xs lg:max-w-sm ${isMe ? 'items-end' : 'items-start'}`}>

                    {/* Sender name (only show when sender changes) */}
                    {showSender && (
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white font-semibold ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-slate-400 text-xs font-medium">
                          {isMe ? 'You' : msg.sender_name}
                        </span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${isMe
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                      }
                      ${msg.temp ? 'opacity-70' : 'opacity-100'}
                    `}>
                      {msg.message}
                      {/* Tail */}
                      <div className={`absolute bottom-0 w-3 h-3 overflow-hidden
                        ${isMe ? '-right-1.5' : '-left-1.5'}`}>
                        <div className={`w-4 h-4 rotate-45 transform origin-bottom-left
                          ${isMe ? 'bg-blue-600 -translate-x-1' : 'bg-slate-700 translate-x-0'}`}
                        />
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-slate-600 text-xs mt-0.5 px-1">
                      {formatTime(msg.created_at)}
                      {msg.temp && ' · Sending...'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            rows={1}
            value={inputText}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3
                       text-white text-sm placeholder-slate-500 resize-none
                       focus:outline-none focus:border-blue-500 transition-all
                       leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !inputText.trim()}
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center transition-all shrink-0
                       active:scale-95"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-5 h-5 text-white rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            }
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-1.5 px-1">
          Messages are visible to you and the {user?.role === 'user' ? 'assigned expert' : 'client'}
        </p>
      </div>
    </div>
  );
}
