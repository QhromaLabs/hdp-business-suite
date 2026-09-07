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
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-b from-card via-background to-card p-6 md:p-8 shadow-2xl transition-all duration-500">
      {/* 🌟 Ambient Animated Orange Glow Backgrounds (Top & Bottom) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-orange-500/25 via-amber-500/15 to-transparent blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-tl from-orange-600/20 via-amber-500/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Top Header Bar: Dynamic Greeting & Casual Today's Revenue */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-2xl shadow-inner relative">
            <Bot className="h-7 w-7 text-orange-500 animate-bounce" style={{ animationDuration: '3s' }} />
            <Sparkles className="h-4 w-4 text-amber-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              {getGreeting()}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>Here's your live business intelligence hub.</span>
              <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] px-2 py-0">
                ● Harry AI Active
              </Badge>
            </p>
          </div>
        </div>

        {/* Casual Right Side Revenue Display & Controls */}
        <div className="flex items-center gap-4 self-end md:self-auto">
          <div className="text-right bg-muted/30 border border-border/50 px-4 py-2 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Today's Revenue</p>
            <p className="text-xl md:text-2xl font-black text-orange-500 font-mono">{formatCurrency(todaySales)}</p>
          </div>

          {/* History Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="rounded-xl gap-1.5 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-400 text-xs font-semibold"
          >
            <History className="h-4 w-4 text-orange-400" />
            <span className="hidden sm:inline">History</span>
          </Button>

          {/* New Chat Button (visible when chat is active) */}
          {isChatActive && (
            <Button
              size="sm"
              onClick={handleStartNewChat}
              className="rounded-xl gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </Button>
          )}
        </div>
      </div>

      {/* 📜 Chat History Slide-Over Drawer */}
      {isHistoryOpen && (
        <div className="relative z-20 mt-4 p-4 bg-muted/60 border border-orange-500/20 rounded-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
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

      {/* 💬 Central Conversational Hero Input & Conversation Area */}
      <div className="relative z-10 mt-6 flex flex-col items-center">
        {/* Still / Initial Centered Presentation */}
        {!isChatActive ? (
          <div className="w-full max-w-3xl flex flex-col items-center text-center my-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Ask Harry about stock, revenue, or orders</span>
            </div>

            {/* Central Glowing Interactive Search/Chat Bar */}
            <div className="w-full relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 opacity-25 group-hover:opacity-40 blur transition duration-300" />
              <div className="relative flex items-center bg-background border border-orange-500/30 rounded-2xl shadow-xl overflow-hidden p-1.5 focus-within:ring-2 focus-within:ring-orange-500/50">
                <div className="pl-3 text-orange-500">
                  <Bot className="h-5 w-5" />
                </div>
                <Input
                  type="text"
                  placeholder="Hello, I am Harry, Your Assistant, ask me anything!"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="border-0 bg-transparent text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 py-3"
                />
                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim()}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shrink-0 h-10 w-10 shadow-md shadow-orange-500/20"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Dynamic Suggestive Prompts */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestivePrompts.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-orange-500/10 border border-border/60 hover:border-orange-500/30 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 shadow-xs"
                  >
                    <Icon className="h-3.5 w-3.5 text-orange-400" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Active Chat Conversation Expanded View */
          <div className="w-full flex flex-col h-[400px] md:h-[460px] bg-background/60 border border-orange-500/20 rounded-2xl overflow-hidden backdrop-blur-md shadow-inner animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Conversation Scroll Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3" ref={scrollRef}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-br-xs shadow-md'
                        : 'bg-card border border-border text-foreground rounded-bl-xs shadow-sm'
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1.5">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center space-x-2 text-muted-foreground text-xs p-3 bg-muted/30 rounded-xl w-fit">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-500" />
                  <span>Harry is analyzing telemetry & reasoning...</span>
                </div>
              )}
            </div>

            {/* Active Bottom Chat Bar */}
            <div className="p-3 border-t border-border/50 bg-background/80 flex gap-2 items-center">
              <Input
                placeholder="Ask Harry follow-up questions..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="text-sm rounded-xl bg-card border-border"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-3 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
