import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare, X, Send, Sparkles, RefreshCw, ShoppingBag, Truck, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AiChatbotService, ChatMessage } from '@/services/aiChatbotService';

export const ClientAiChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Hello! 👋 I am your **Live AI Assistant**. I have real-time access to our store inventory and order tracking. How can I help you today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
          content: 'Sorry, I ran into an issue connecting to the live database. Please try again in a moment!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (content: string) => {
    // Simple markdown formatting for bold and list items
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return (
        <div 
          key={idx} 
          className={line.startsWith('•') ? 'ml-3 my-1 font-medium' : 'my-1'}
          dangerouslySetInnerHTML={{ __html: formatted }} 
        />
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[380px] sm:w-[420px] h-[540px] shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md flex flex-col mb-4 rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-primary/90 to-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
                <Bot className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Live AI Assistant
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-none px-1.5 py-0.5">
                    ● Live DB Context
                  </Badge>
                </CardTitle>
                <p className="text-xs text-primary-foreground/80">Real-time inventory & order support</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Quick Action Suggestion Pills */}
          <div className="bg-muted/40 p-2 border-b flex gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => handleSendMessage('Check my order status')}
              className="flex items-center gap-1 px-2.5 py-1 bg-background hover:bg-accent border rounded-full text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              <Truck className="h-3 w-3 text-blue-500" /> Track Order
            </button>
            <button
              onClick={() => handleSendMessage('List in-stock products')}
              className="flex items-center gap-1 px-2.5 py-1 bg-background hover:bg-accent border rounded-full text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              <ShoppingBag className="h-3 w-3 text-emerald-500" /> In-Stock Items
            </button>
            <button
              onClick={() => handleSendMessage('Store contact details')}
              className="flex items-center gap-1 px-2.5 py-1 bg-background hover:bg-accent border rounded-full text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              <Phone className="h-3 w-3 text-purple-500" /> Contact Info
            </button>
          </div>

          {/* Messages Area */}
          <CardContent className="flex-1 p-4 overflow-y-auto space-y-3" ref={scrollRef}>
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
                <span>Reading live database context...</span>
              </div>
            )}
          </CardContent>

          {/* Input Footer */}
          <CardFooter className="p-3 border-t bg-background flex gap-2">
            <Input
              placeholder="Ask about products, stock, or orders..."
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
        className="rounded-full h-14 w-14 shadow-xl bg-gradient-to-r from-primary to-primary/80 hover:scale-105 transition-all duration-300 p-0 flex items-center justify-center relative border border-primary-foreground/20"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <>
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
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
