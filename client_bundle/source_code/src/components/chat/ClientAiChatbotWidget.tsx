import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, MessageSquare, X, Send, Key, Check, ShoppingBag, Truck, Phone, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiChatbotService, ChatMessage, LiveBusinessContext } from '@/services/aiChatbotService';

export const ClientAiChatbotWidget: React.FC = () => {
  const location = useLocation();
  const isDashboardPage = location.pathname === '/' || location.pathname === '/dashboard';

  const [isOpen, setIsOpen] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState<LiveBusinessContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('OPENROUTER_API_KEY') || '';
    setApiKey(savedKey);

    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Hi! 👋 I am **Harry**, your live AI Assistant. I just synced our latest 30-day monthly orders, stock changes, and live pricing. How can I help you today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  // Lazy update context whenever the client opens the chat widget
  useEffect(() => {
    if (isOpen) {
      AiChatbotService.getLiveContext(true).then(ctx => {
        setContextInfo(ctx);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // If on Dashboard page, Harry AI is integrated into the hero area, so hide the floating widget
  if (isDashboardPage) {
    return null;
  }

  const handleSaveKey = () => {
    localStorage.setItem('OPENROUTER_API_KEY', apiKey.trim());
    setShowKeyInput(false);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **OpenRouter Key Saved!** Harry is now using your custom key for free reasoning models.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await AiChatbotService.generateResponse(text, messages);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="w-[380px] sm:w-[420px] h-[560px] shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md flex flex-col mb-4 rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-primary/90 via-primary to-primary/80 text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-foreground/15 rounded-xl backdrop-blur-sm relative">
                <Bot className="h-6 w-6 text-primary-foreground" />
                <Sparkles className="h-3 w-3 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Harry AI Assistant
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-none px-1.5 py-0.5">
                    ● Live Store Data
                  </Badge>
                </CardTitle>
                <p className="text-xs text-primary-foreground/80">Monthly Orders & Inventory Insights</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8"
                onClick={() => setShowKeyInput(!showKeyInput)}
                title="Configure OpenRouter Key"
              >
                <Key className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* API Key Modal Banner */}
          {showKeyInput && (
            <div className="p-3 bg-muted border-b flex flex-col gap-2 animate-in fade-in">
              <span className="text-xs font-medium text-foreground">
                <strong>OpenRouter API Key</strong> (Free Reasoning Models):
              </span>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="text-xs h-8 bg-background"
                />
                <Button size="sm" className="h-8 text-xs px-3" onClick={handleSaveKey}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>
          )}

          {/* Context Telemetry Bar */}
          {contextInfo && (
            <div className="bg-primary/5 px-3 py-1.5 border-b text-[11px] text-muted-foreground flex justify-between items-center">
              <span>📊 30-Day Orders: <strong>{contextInfo.monthlyStats.totalMonthlyOrders}</strong> | Stock: <strong>{contextInfo.inStockProducts.length} items</strong></span>
              <span className="text-[10px] text-primary/70">Updated {contextInfo.lastUpdated}</span>
            </div>
          )}

          {/* Quick Action Suggestion Pills */}
          <div className="bg-muted/40 p-2 border-b flex gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => handleSendMessage('Summarize our 30-day monthly orders')}
              className="flex items-center gap-1 px-2.5 py-1 bg-background hover:bg-accent border rounded-full text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              <Truck className="h-3 w-3 text-blue-500" /> Monthly Orders
            </button>
            <button
              onClick={() => handleSendMessage('What products are currently in stock?')}
              className="flex items-center gap-1 px-2.5 py-1 bg-background hover:bg-accent border rounded-full text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              <ShoppingBag className="h-3 w-3 text-emerald-500" /> Stock & Prices
            </button>
            <button
              onClick={() => handleSendMessage('Store contact details')}
              className="flex items-center gap-1 px-2.5 py-1 bg-background hover:bg-accent border rounded-full text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              <Phone className="h-3 w-3 text-purple-500" /> Contact Info
            </button>
          </div>

          {/* Messages Area */}
          <CardContent className="flex-1 p-4 overflow-y-auto custom-minimal-scrollbar space-y-3" ref={scrollRef}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none shadow-sm'
                      : 'bg-muted/80 border text-foreground rounded-bl-none shadow-xs'
                  }`}
                >
                  {renderFormattedText(msg.content)}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-muted-foreground text-xs p-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Harry is analyzing live store data & generating response...</span>
              </div>
            )}
          </CardContent>

          {/* Input Footer */}
          <CardFooter className="p-3 border-t bg-background flex gap-2">
            <Input
              placeholder="Ask Harry about orders, stock, or revenue..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              className="text-sm rounded-xl"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="rounded-xl px-3"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Floating Toggle Button */}
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full h-14 w-14 shadow-xl bg-gradient-to-r from-primary via-primary to-primary/80 hover:scale-105 transition-all duration-300 p-0 flex items-center justify-center relative border border-primary-foreground/20"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <>
            <Bot className="h-6 w-6 text-primary-foreground" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-background"></span>
            </span>
          </>
        )}
      </Button>
    </div>
  );
};
