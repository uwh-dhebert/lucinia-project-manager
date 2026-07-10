'use client';

import { useState, useRef, useEffect } from 'react';
import { randomUUID } from 'crypto';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation on mount
  useEffect(() => {
    // Generate a unique conversation ID using timestamp + random string
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(id);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-lucina-primary">Project & Wiki Assistant</h1>
        <p className="text-lucina-muted mt-2">Get AI-powered help with your projects and documentation</p>
      </div>

      <div className="border border-lucina-rose rounded-2xl overflow-hidden flex flex-col h-96 bg-lucina-white">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="text-5xl mb-4">💬</div>
                <h2 className="text-xl font-semibold text-lucina-primary mb-2">Project & Wiki Assistant</h2>
                <p className="text-lucina-muted text-sm">Ask questions about your projects and documentation</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-lucina-rose text-lucina-primary rounded-br-none'
                        : 'bg-lucina-surface text-lucina-primary rounded-bl-none'
                    }`}
                  >
                    <p>{msg.content}</p>
                    {msg.model && (
                      <p className="text-xs text-lucina-muted mt-1">
                        {msg.model}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-lucina-surface text-lucina-primary rounded-xl rounded-bl-none px-4 py-2">
                    <div className="flex space-x-2">
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

        {/* Error message */}
        {error && (
          <div className="border-t border-lucina-rose bg-red-50 border-red-800 p-3">
            <p className="text-sm text-red-700">Error: {error}</p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-lucina-rose p-4 bg-lucina-primary">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send)"
              className="flex-1 px-4 py-2 border border-lucina-rose rounded-full focus:outline-none focus:ring-2 focus:ring-lucina-secondary bg-lucina-white text-lucina-primary placeholder-lucina-muted disabled:bg-lucina-surface"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-lucina-rose text-lucina-primary rounded-full hover:bg-lucina-rose-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-lucina-surface border border-lucina-rose rounded-2xl p-6">
        <p className="text-sm text-lucina-secondary mb-3">
          💡 <strong>Tip:</strong> This chatbot helps with your projects and wiki content only.
        </p>
        <p className="text-xs text-lucina-secondary">
          You can ask about: project management, tasks, documentation, wiki topics, and content organization.
        </p>
      </div>
    </div>
  );
}

