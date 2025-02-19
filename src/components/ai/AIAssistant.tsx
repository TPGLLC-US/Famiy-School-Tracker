import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, X, Settings, Send, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getApiKey, saveApiKey } from '../../lib/api';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface AIAssistantProps {
  onClose: () => void;
}

export function AIAssistant({ onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const location = useLocation();

  // Add query for API key
  const { data: savedApiKey } = useQuery({
    queryKey: ['api-key'],
    queryFn: getApiKey,
    enabled: !!user
  });

  // Set API key from saved value
  useEffect(() => {
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [savedApiKey]);

  // Save API key when updated
  const handleApiKeyChange = async (newKey: string) => {
    setApiKey(newKey);
    try {
      await saveApiKey(newKey);
    } catch (err) {
      console.error('Failed to save API key:', err);
      setError('Failed to save API key');
    }
  };

  // Get current subject if we're on a subject page
  const subjectId = location.pathname.startsWith('/subjects/') 
    ? location.pathname.split('/').pop() 
    : null;

  const { data: performance } = useQuery({
    queryKey: ['student-performance', user?.email],
    enabled: !!user?.email
  });

  const { data: currentSubject } = useQuery({
    queryKey: ['subject', subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          assignments (*)
        `)
        .eq('id', subjectId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSystemPrompt = () => {
    let prompt = `You are an AI learning assistant helping a student with their academic performance.`;

    // Add overall performance context
    if (performance?.length > 0) {
      prompt += `\n\nOverall academic performance:\n${JSON.stringify(performance, null, 2)}`;
    }

    // Add specific subject context if available
    if (currentSubject) {
      prompt += `\n\nCurrent subject details:\n${JSON.stringify(currentSubject, null, 2)}`;
      
      // Calculate subject statistics
      if (currentSubject.assignments?.length > 0) {
        const assignments = currentSubject.assignments;
        const avgScore = assignments.reduce((sum, a) => sum + (a.score / a.max_score * 100), 0) / assignments.length;
        const recentAssignments = assignments
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3);
        
        prompt += `\n\nSubject Statistics:
- Average Score: ${avgScore.toFixed(1)}%
- Total Assignments: ${assignments.length}
- Recent Assignments: ${JSON.stringify(recentAssignments, null, 2)}`;
      }
    }

    prompt += `\n\nProvide helpful, encouraging advice and specific suggestions for improvement. Keep responses concise and actionable.`;

    return prompt;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: getSystemPrompt()
            },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          <h3 className="font-medium">AI Learning Assistant</h3>
          {currentSubject && (
            <span className="text-sm text-gray-500">
              • {currentSubject.subject}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(prev => !prev)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <Settings className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Your API key is stored securely and encrypted.
          </p>
        </div>
      )}

      {!apiKey && !showSettings && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-100">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <p className="text-sm text-yellow-700">
              Please set your OpenAI API key in settings to use the AI assistant.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex items-start space-x-2",
              message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
            )}
          >
            {message.role === 'assistant' && (
              <Bot className="h-8 w-8 p-1 rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0" />
            )}
            <div
              className={cn(
                "rounded-lg px-4 py-2 max-w-[80%]",
                message.role === 'assistant' 
                  ? "bg-gray-100 text-gray-900"
                  : "bg-indigo-600 text-white"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 p-1 rounded-full bg-indigo-100 text-indigo-600" />
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentSubject 
              ? `Ask about ${currentSubject.subject}...`
              : "Ask about your grades, study tips, or get help..."
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            disabled={!apiKey}
          />
          <button
            type="submit"
            disabled={!apiKey || !input.trim() || isTyping}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}