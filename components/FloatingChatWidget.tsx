'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [pageContext, setPageContext] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Initialize conversation on mount
  useEffect(() => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(id);
  }, []);

  // Extract page context
  useEffect(() => {
    const context = extractPageContext();
    setPageContext(context);
  }, [pathname]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractPageContext = (): string => {
    // Determine current page and extract relevant context
    if (pathname.includes('/chat')) {
      return 'user_is_on_chat_page';
    } else if (pathname.includes('/projects')) {
      // Try to extract project slug from URL
      const projectMatch = pathname.match(/\/projects\/([^/]+)/);
      if (projectMatch) {
        return `user_is_viewing_project:${projectMatch[1]}`;
      }
      return 'user_is_on_projects_page';
    } else if (pathname.includes('/wiki')) {
      // Try to extract wiki slug and subject slug
      const wikiMatch = pathname.match(/\/wiki\/([^/]+)\/([^/]+)/);
      if (wikiMatch) {
        return `user_is_viewing_wiki_topic:${wikiMatch[1]}_subject:${wikiMatch[2]}`;
      }
      const topicMatch = pathname.match(/\/wiki\/([^/]+)/);
      if (topicMatch) {
        return `user_is_viewing_wiki_topic:${topicMatch[1]}`;
      }
      return 'user_is_on_wiki_page';
    } else if (pathname.includes('/dashboard')) {
      return 'user_is_on_dashboard';
    } else if (pathname.includes('/documentation')) {
      return 'user_is_on_documentation_page';
    } else if (pathname.includes('/links')) {
      return 'user_is_on_links_page';
    }
    return 'user_is_on_app';
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !conversationId) {
      return;
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          userMessage: userMessage.content,
          pageContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: data.assistantMessageId || Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: data.response.content,
        timestamp: new Date(),
        model: data.response.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversationId) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-96 max-h-96 bg-lucina-white border border-lucina-rose rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-lucina-rose to-lucina-rose-hover px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-lucina-primary font-semibold">Project & Wiki Assistant</h3>
              <p className="text-lucina-cream text-xs">Powered by xAI Grok</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-lucina-primary hover:bg-lucina-rose-hover p-1 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-lucina-muted text-sm py-4">
                <p>👋 How can I help you today?</p>
                <p className="text-xs mt-2">Ask about projects or wiki content</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.role === 'user'
                          ? 'bg-lucina-rose text-lucina-primary rounded-br-none'
                          : 'bg-lucina-surface text-lucina-primary rounded-bl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-lucina-surface text-lucina-primary rounded-lg rounded-bl-none px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-lucina-muted rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-lucina-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-lucina-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="border-t border-lucina-rose bg-red-50 border-red-800 p-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-lucina-rose p-3 bg-lucina-primary">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-sm border border-lucina-rose rounded-full focus:outline-none focus:ring-2 focus:ring-lucina-secondary bg-lucina-white text-lucina-primary placeholder-lucina-muted disabled:bg-lucina-surface"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 text-sm bg-lucina-rose text-lucina-primary rounded-full hover:bg-lucina-rose-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center justify-center ${
          isOpen
            ? 'bg-lucina-surface text-lucina-primary'
            : 'bg-gradient-to-br from-lucina-rose to-lucina-rose-hover text-lucina-primary hover:from-lucina-rose-hover hover:to-lucina-secondary'
        }`}
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}

