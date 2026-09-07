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
  ChevronDown,
  Mic
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

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.full_name?.split(' ')[0];
    const prefix = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    return name ? `${prefix}, ${name}!` : `${prefix}, Sir?`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('HARRY_CHAT_HISTORY');
      if (stored) {
        setSavedSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse saved sessions:', e);
    }
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
          content: 'Sorry, I ran into an error generating that response. Please try again!',
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
    { label: '📦 Low stock warning items', icon: AlertTriangle, query: 'Which items are low on stock?' },
    { label: '💰 Summarize today\'s sales', icon: TrendingUp, query: 'Summarize today\'s sales and revenue breakdown' },
    { label: '🚚 In-transit orders status', icon: Truck, query: 'How many orders are currently in transit or pending dispatch?' },
    { label: '🔎 Search Mosquito Nets', icon: ShoppingBag, query: 'Check stock and pricing for mosquito nets' },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 transition-all duration-700">
      {/* 🌈 Vibrant Lovable-Style Mesh Gradient Aura (Darkmode & Lightmode adapted) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        {/* Soft Background Mesh Blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-orange-500/20 via-amber-500/15 via-purple-500/15 to-blue-500/20 dark:from-orange-600/30 dark:via-amber-600/20 dark:via-purple-600/25 dark:to-blue-600/20 blur-3xl opacity-90 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-orange-500/30 via-pink-500/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-blue-500/25 via-purple-500/20 to-transparent blur-3xl" />
      </div>

      {/* Top Controls Bar: Casual Revenue & Buttons */}
      <div className="flex items-center justify-between gap-4 pb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/60 dark:bg-card/80 border border-orange-500/20 text-orange-500 dark:text-orange-400 text-xs font-semibold backdrop-blur-md shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Harry AI Assistant</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Casual Today's Revenue Counter */}
          <div className="text-right px-3.5 py-1.5 rounded-2xl bg-background/50 dark:bg-card/60 border border-border/40 backdrop-blur-md">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">Today's Revenue</span>
            <span className="text-sm md:text-base font-black text-orange-500 font-mono">{formatCurrency(todaySales)}</span>
          </div>

          {/* History Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="rounded-2xl gap-1.5 bg-background/60 dark:bg-card/80 border-border/60 hover:bg-orange-500/10 hover:border-orange-500/30 text-xs font-semibold backdrop-blur-md"
          >
            <History className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">History</span>
          </Button>

          {/* New Chat Button (visible when chat is active) */}
          {isChatActive && (
            <Button
              size="sm"
              onClick={handleStartNewChat}
              className="rounded-2xl gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </Button>
          )}
        </div>
      </div>

      {/* 📜 Chat History Slide-Over Drawer */}
      {isHistoryOpen && (
        <div className="mb-6 p-4 bg-background/80 dark:bg-card/90 border border-orange-500/20 rounded-2xl backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-orange-500" /> Previous Conversations
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setIsHistoryOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto no-scrollbar">
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
        <div className="flex flex-col items-center text-center py-8 md:py-12 animate-in fade-in zoom-in-95 duration-500">
          {/* Bold Centered Headline */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground max-w-3xl leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-3 font-medium max-w-xl">
            Ask Harry to analyze inventory, track revenue, or query orders.
          </p>

          {/* 🪩 LOVABLE-STYLE FLOATING PILL CHAT BAR */}
          <div className="w-full max-w-2xl mt-8 relative group">
            {/* Ambient Glow behind Pill */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 via-purple-500 to-blue-500 opacity-35 group-hover:opacity-60 blur-lg transition duration-500" />

            {/* Floating Glassmorphism Pill Container */}
            <div className="relative flex items-center bg-background/90 dark:bg-card/95 border border-white/40 dark:border-white/10 rounded-full shadow-2xl backdrop-blur-2xl p-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-orange-500/50">
              {/* Left Plus Icon Button */}
              <button
                type="button"
                onClick={() => setInputValue(prev => prev ? prev : 'Summarize store stock')}
                className="p-2.5 rounded-full bg-muted/60 hover:bg-orange-500/20 text-muted-foreground hover:text-orange-500 transition-colors ml-1"
                title="Add shortcut query"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Central Input */}
              <Input
                type="text"
                placeholder="Ask Harry about stock, revenue, or orders..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="border-0 bg-transparent text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 px-4 py-3"
              />

              {/* Right Mode Selector & Send Pill */}
              <div className="flex items-center gap-1.5 pr-1">
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground px-3 py-1.5 rounded-full bg-muted/40 border border-border/30">
                  Ask Harry <ChevronDown className="h-3 w-3" />
                </span>

                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim()}
                  className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shrink-0 h-10 w-10 shadow-md shadow-orange-500/25"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Suggestive Chips Under Pill */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
            {suggestivePrompts.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-background/60 dark:bg-card/70 hover:bg-orange-500/15 border border-border/50 hover:border-orange-500/30 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 shadow-xs backdrop-blur-md"
                >
                  <Icon className="h-3.5 w-3.5 text-orange-500" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ACTIVE CHAT CONVERSATION VIEW */
        <div className="w-full flex flex-col h-[420px] md:h-[480px] bg-background/80 dark:bg-card/90 border border-orange-500/20 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 mt-4">
          {/* Conversation Scroll Container */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3.5" ref={scrollRef}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-br-xs shadow-md'
                      : 'bg-card dark:bg-slate-900/90 border border-border text-foreground rounded-bl-xs shadow-sm'
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
              <div className="flex items-center space-x-2 text-muted-foreground text-xs p-3 bg-muted/40 rounded-xl w-fit">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-500" />
                <span>Harry is analyzing live telemetry & reasoning...</span>
              </div>
            )}
          </div>

          {/* Active Bottom Chat Bar */}
          <div className="p-3.5 border-t border-border/50 bg-background/90 dark:bg-slate-950/80 flex gap-2 items-center">
            <Input
              placeholder="Ask Harry follow-up questions..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              className="text-sm rounded-2xl bg-card border-border px-4 py-2.5"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white px-4 shrink-0 h-10 w-10 shadow-md shadow-orange-500/20"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
