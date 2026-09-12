import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  History,
  Plus,
  RefreshCw,
  X,
  TrendingUp,
  ShoppingBag,
  Truck,
  AlertTriangle,
  Brain,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { AiChatbotService, ChatMessage } from '@/services/aiChatbotService';

interface HarryDashboardHeroProps {
  todaySales?: number;
}

interface SavedSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

export const HarryDashboardHero: React.FC<HarryDashboardHeroProps> = ({ todaySales = 0 }) => {
  const { profile } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [advisories, setAdvisories] = useState<string[]>([]);

  // Time-aware greeting for Justin / HDPK Wholesale store owner
  const getGreeting = () => {
    const hour = new Date().getHours();
    const rawName = profile?.full_name?.split(' ')[0];
    // Map Justine to Justin if specified, or fallback to Justin
    const name = (rawName && rawName.toLowerCase() === 'justine') ? 'Justin' : (rawName || 'Justin');
    const prefix = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    return `${prefix}, ${name}!`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Load live advisories & chat history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('HARRY_CHAT_HISTORY');
      if (stored) {
        setSavedSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse saved sessions:', e);
    }

    AiChatbotService.getLiveContext().then(ctx => {
      if (ctx && ctx.proactiveAdvisories) {
        setAdvisories(ctx.proactiveAdvisories);
      }
    });
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    if (!isChatActive) {
      setIsChatActive(true);
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await AiChatbotService.generateResponse(text, newMessages);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      // Auto-save session
      saveCurrentSession(updatedMessages);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry sir, I couldn't process that. Kindly check with Qhroma Labs AI team [here](https://qhroma.co.ke/labs/ai-agent/) to submit a crash report to qhromalabs@gmail.com.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentSession = (msgs: ChatMessage[]) => {
    if (msgs.length === 0) return;
    const firstUserMsg = msgs.find(m => m.role === 'user')?.content || 'Conversation with Harry';
    const title = firstUserMsg.length > 30 ? firstUserMsg.slice(0, 30) + '...' : firstUserMsg;

    const newSession: SavedSession = {
      id: Date.now().toString(),
      title,
      timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: msgs
    };

    setSavedSessions(prev => {
      const filtered = prev.filter(s => s.id !== newSession.id);
      const updated = [newSession, ...filtered].slice(0, 15);
      localStorage.setItem('HARRY_CHAT_HISTORY', JSON.stringify(updated));
      return updated;
    });
  };

  const handleStartNewChat = () => {
    if (messages.length > 0) {
      saveCurrentSession(messages);
    }
    setMessages([]);
    setIsChatActive(false);
    setInputValue('');
  };

  const handleClearAllHistory = () => {
    localStorage.removeItem('HARRY_CHAT_HISTORY');
    localStorage.removeItem('OPENROUTER_CHAT_HISTORY');
    setSavedSessions([]);
    setMessages([]);
    setIsChatActive(false);
    setIsHistoryOpen(false);
    setInputValue('');
  };

  const handleLoadSession = (session: SavedSession) => {
    setMessages(session.messages);
    setIsChatActive(true);
    setIsHistoryOpen(false);
  };

  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Format markdown links [Text](URL)
      formatted = formatted.replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-orange-400 hover:text-orange-300 font-semibold">$1</a>');
      // Format raw URLs
      formatted = formatted.replace(/(?<!href=")(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline text-orange-400 hover:text-orange-300 font-semibold">$1</a>');
      return (
        <div
          key={idx}
          className={line.startsWith('•') || line.startsWith('-') ? 'ml-3 my-1 font-medium' : 'my-1'}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  const suggestivePrompts = [
    { label: '💰 Summarize today\'s sales', icon: TrendingUp, query: 'Summarize today\'s sales and revenue breakdown' },
    { label: '📦 Low stock warning items', icon: AlertTriangle, query: 'Which items are low on stock?' },
    { label: '🚚 In-transit orders status', icon: Truck, query: 'How many orders are currently in transit or pending dispatch?' },
    { label: '🔎 Search product catalog', icon: ShoppingBag, query: 'Check stock levels and pricing across our catalog' },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl p-4 md:p-8 transition-all duration-700">
      {/* 🌟 Subtle Ambient Background Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-orange-500/10 dark:bg-orange-500/15 blur-3xl rounded-full opacity-50" />
      </div>

      {/* Top Controls Bar: Today's Revenue on LEFT & Action Buttons on RIGHT */}
      <div className="flex items-center justify-between gap-4 pb-4">
        {/* LEFT: Casual Today's Revenue Counter */}
        <div className="text-left px-4 py-1.5 rounded-2xl bg-background/60 dark:bg-card/70 border border-border/50 backdrop-blur-md shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">Today's Revenue</span>
          <span className="text-sm md:text-base font-black text-orange-500 font-mono">{formatCurrency(todaySales)}</span>
        </div>

        {/* RIGHT: History & New Chat Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="rounded-2xl gap-1.5 bg-background/60 dark:bg-card/80 border-border/60 hover:bg-orange-500/10 hover:border-orange-500/30 text-xs font-semibold backdrop-blur-md"
          >
            <History className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">History</span>
          </Button>

          {isChatActive && (
            <Button
              size="sm"
              onClick={handleStartNewChat}
              className="rounded-2xl gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-500/25"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </Button>
          )}
        </div>
      </div>

      {/* 📜 Chat History Slide-Over Drawer */}
      {isHistoryOpen && (
        <div className="mb-6 p-4 bg-background/90 dark:bg-card/95 border border-orange-500/20 rounded-2xl backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-orange-500" /> Previous Conversations
            </h3>
            <div className="flex items-center gap-2">
              {savedSessions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllHistory}
                  className="h-7 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2 rounded-xl"
                  title="Clear all stored chat sessions"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setIsHistoryOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-minimal-scrollbar">
            {savedSessions.length > 0 ? (
              savedSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => handleLoadSession(session)}
                  className="p-3 text-left bg-background/80 hover:bg-orange-500/10 border border-border/50 hover:border-orange-500/30 rounded-xl transition-all group"
                >
                  <p className="text-xs font-medium text-foreground truncate group-hover:text-orange-400">{session.title}</p>
                  <span className="text-[10px] text-muted-foreground block mt-1">{session.timestamp}</span>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center col-span-full">No previous chat sessions saved yet.</p>
            )}
          </div>
        </div>
      )}

      {/* 🌟 LOVABLE-STYLE HERO PRESENTATION (WHEN STILL / NO CHAT) */}
      {!isChatActive ? (
        <div className="flex flex-col items-center text-center py-8 md:py-14 animate-in fade-in zoom-in-95 duration-500">
          {/* Subtle Disclaimer Text */}
          <span className="text-xs text-muted-foreground/60 font-medium mb-3">
            Harry is a Qhroma Labs AI Agent. The Agent could make mistakes.
          </span>

          {/* Bold Centered Headline */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground max-w-4xl leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mt-3 font-medium max-w-xl">
            Ask Harry to analyze inventory, track revenue, or query orders.
          </p>

          {/* 🪩 VERY BIG FLOATING CHAT PILL INPUT */}
          <div className="w-full max-w-3xl md:max-w-4xl mt-8 md:mt-10 relative group">
            {/* Vibrant Gradient Glow behind Pill */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 via-purple-500 to-blue-500 opacity-55 group-hover:opacity-85 blur-xl transition duration-500 animate-pulse" style={{ animationDuration: '4s' }} />

            {/* Floating Glassmorphism Pill Container (VERY BIG) */}
            <div className="relative flex items-center bg-background/90 dark:bg-card/95 border border-white/40 dark:border-white/10 rounded-full shadow-2xl backdrop-blur-2xl p-2.5 md:p-3.5 transition-all duration-300 focus-within:ring-2 focus-within:ring-orange-500/50">
              {/* Left Plus Icon Button */}
              <button
                type="button"
                onClick={() => setInputValue(prev => prev ? prev : 'Summarize store stock')}
                className="p-3 rounded-full bg-muted/60 hover:bg-orange-500/20 text-muted-foreground hover:text-orange-500 transition-colors ml-1.5"
                title="Add shortcut query"
              >
                <Plus className="h-6 w-6" />
              </button>

              {/* Central Input (VERY BIG & CLEAR) */}
              <Input
                type="text"
                placeholder="Ask Harry about stock, revenue, or orders..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="border-0 bg-transparent text-base md:text-xl font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 px-4 py-3 md:py-4"
              />

              {/* Right Send Button Pill */}
              <div className="flex items-center pr-1.5">
                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim()}
                  className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shrink-0 h-12 w-12 shadow-lg shadow-orange-500/30"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Suggestive Chips Under Pill */}
          <div className="mt-8 flex flex-wrap justify-center gap-2.5 max-w-3xl">
            {suggestivePrompts.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 dark:bg-card/70 hover:bg-orange-500/15 border border-border/50 hover:border-orange-500/30 text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 shadow-xs backdrop-blur-md"
                >
                  <Icon className="h-4 w-4 text-orange-500" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* 💬 ACTIVE CHAT CONVERSATION VIEW (WITH VIBRANT GRADIENT GLOW) */
        <div className="w-full relative group mt-2">
          {/* Vibrant Gradient Glow behind Chat Card */}
          <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-orange-500/40 via-amber-500/30 via-purple-500/30 to-blue-500/40 blur-2xl opacity-75 transition duration-500 animate-pulse" style={{ animationDuration: '5s' }} />

          {/* Glowing Glassmorphism Gradient Chat Card */}
          <div className="relative w-full flex flex-col h-[440px] md:h-[520px] bg-gradient-to-b from-card/95 via-background/90 to-card/95 border border-orange-500/40 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-[0_0_50px_-10px_rgba(249,115,22,0.35)] animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Conversation Scroll Container (MINIMAL MINIMAL SCROLLBAR LIKE SIDEBAR) */}
            <div className="flex-1 p-5 overflow-y-auto custom-minimal-scrollbar space-y-4" ref={scrollRef}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-tr-xs shadow-md'
                        : 'bg-card/95 dark:bg-slate-950/85 border border-border/80 text-foreground rounded-tl-xs shadow-sm'
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1.5 font-medium">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center space-x-2 text-muted-foreground text-xs p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl w-fit animate-pulse">
                  <Brain className="h-4 w-4 text-orange-500 animate-pulse" />
                  <span className="font-semibold text-orange-400">Harry is thinking...</span>
                </div>
              )}
            </div>

            {/* Active Bottom Input Bar (Big & Clear) */}
            <div className="p-3.5 md:p-4 border-t border-border/50 bg-background/90 dark:bg-slate-950/90 flex gap-2.5 items-center backdrop-blur-md">
              <Input
                placeholder="Ask Harry follow-up questions..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="text-base rounded-2xl bg-card border-border px-4 py-3 md:py-3.5"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white px-4 shrink-0 h-11 w-11 shadow-md shadow-orange-500/20"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
