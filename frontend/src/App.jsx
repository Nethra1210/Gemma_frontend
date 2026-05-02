import React, { useState, useEffect, useRef } from 'react';
import { Plus, Settings, Send, User, Share2, MoreVertical, Paperclip, ChevronDown, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './index.css';

function App() {
  // Initialize from Local Storage
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('gemma_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemma_selected_model') || '');
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Persistence logic
  useEffect(() => {
    localStorage.setItem('gemma_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('gemma_selected_model', selectedModel);
  }, [selectedModel]);

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:8000/models');
        const data = await response.json();
        if (data.models) {
          const names = data.models.map(m => m.name);
          setAvailableModels(names);
          if (!selectedModel && names.length > 0) setSelectedModel(names[0]);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };
    fetchModels();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          model: selectedModel 
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to Gemma4');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', content: 'Ops! ' + error.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      setMessages([]);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">G</div>
            <span>Gemma4</span>
          </div>
          <button className="new-chat-btn" onClick={() => setMessages([])}>
            <Plus size={18} /> New Chat
          </button>
        </div>
        
        <div className="chat-history">
          <div className="history-item active">Current Conversation</div>
          {messages.length > 0 && (
            <button className="history-item delete-history" onClick={clearChat} style={{marginTop: 'auto', border: 'none', background: 'none', color: '#ff7675', display: 'flex', alignItems: 'center', gap: '8px'}}>
               <Trash2 size={14} /> Clear History
            </button>
          )}
        </div>
        
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">U</div>
            <span>Guest User</span>
          </div>
          <div className="settings-icons">
            <Settings size={18} />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-chat">
        <header className="chat-header">
          <div className="model-selector-container">
            <div className="model-info">
              <span className="badge">PRO</span>
              {availableModels.length > 0 ? (
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-select"
                >
                  {availableModels.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <h1>{selectedModel || 'Loading Models...'}</h1>
              )}
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn"><Share2 size={18} /></button>
            <button className="icon-btn"><MoreVertical size={18} /></button>
          </div>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="message system-message">
              <div className="message-content">
                <div className="bot-avatar">G</div>
                <div className="text">
                  <h2>Hello! I'm Gemma4.</h2>
                  <p>I'm powered by your custom model library. You can choose a different model from the dropdown above if you have multiple installed.</p>
                  <div className="suggestions">
                    {['Compare these two ideas...', 'Write a story about a robot', 'Help me debug this React code'].map(s => (
                      <button key={s} className="suggestion-chip" onClick={() => setInput(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`message ${m.role}-message`}>
                <div className="message-content">
                  <div className={m.role === 'user' ? 'user-avatar' : 'bot-avatar'}>
                    {m.role === 'user' ? <User size={20} /> : 'G'}
                  </div>
                  <div className="text">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message bot-message">
              <div className="message-content">
                <div className="bot-avatar">G</div>
                <div className="typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <footer className="input-area">
          <form onSubmit={handleSend} className="chat-input-container">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                placeholder="Message Gemma4..."
                rows="1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <div className="input-actions">
                <button type="button" className="tool-btn"><Paperclip size={18} /></button>
                <button type="submit" className="send-btn" disabled={!input.trim() || isLoading}>
                  <Send size={16} />
                </button>
              </div>
            </div>
            <p className="disclaimer">Gemma4 can make mistakes. Check important info.</p>
          </form>
        </footer>
      </main>
    </div>
  );
}

export default App;
