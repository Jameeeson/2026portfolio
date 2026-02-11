'use client';

import { useState } from 'react';
import styles from './ChatPanel.module.css';
import { useLipSync } from '../Avatar3D/lipsync';

type ChatPanelProps = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
};

export default function ChatPanel({ isCollapsed, setIsCollapsed }: ChatPanelProps) {
  const [messages, setMessages] = useState<Array<{ text: string; rawText?: string; isUser: boolean }>>([
    { text: "Hi! I'm your AI assistant. How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { playAudio } = useLipSync();

  const cleanText = (text: string) => {
    return text.replace(/\[.*?\]/g, '').trim().replace(/\s+/g, ' ');
  };

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      const userMessage = { text: input, isUser: true };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/llm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: newMessages.map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.text,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch response');
        }

        const data = await response.json();
        const rawText = data.text;
        const displayText = cleanText(rawText);
        
        // Auto-play default: fetch TTS then show message
        try {
            const ttsResponse = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: rawText }),
            });
    
            if (!ttsResponse.ok) throw new Error('TTS failed');
    
            const blob = await ttsResponse.blob();
            const url = URL.createObjectURL(blob);


            // Show message only when audio is ready
            setMessages(prev => [...prev, { 
            text: displayText, 
            rawText: rawText,
            isUser: false 
          }]);
        
        await playAudio(url);

        } catch (ttsError) {
             console.error("TTS error:", ttsError);
             // Fallback: show message even if TTS fails
             setMessages(prev => [...prev, { 
              text: displayText, 
              rawText: rawText,
              isUser: false 
            }]);
        }

      } catch (error) {
        console.error('Error calling Groq:', error);
        setMessages(prev => [...prev, { 
          text: "I'm sorry, I'm having trouble connecting right now.", 
          isUser: false 
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`${styles.chatPanel} ${isCollapsed ? styles.collapsed : ''}`}>
      <button 
        className={styles.hamburgerButton} 
        onClick={() => setIsCollapsed(!isCollapsed)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
          }
        }}
        aria-label="Toggle Menu"
      >
        <div className={`${styles.hamburgerIcon} ${isCollapsed ? '' : styles.active}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Welcome to My Portfolio</h1>
            <p className={styles.subtitle}>Ask me anything about my work and experience</p>
          </div>
        </div>
        
        <div className={styles.messagesContainer}>
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`${styles.message} ${message.isUser ? styles.userMessage : styles.aiMessage}`}
            >
              {message.text}
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.message} ${styles.aiMessage} ${styles.loadingMessage}`}>
              <span className={styles.loadingDot}></span>
              <span className={styles.loadingDot}></span>
              <span className={styles.loadingDot}></span>
            </div>
          )}
        </div>

        <div className={styles.inputContainer}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            className={styles.input}
            disabled={isLoading}
          />
          <button onClick={handleSend} className={styles.sendButton} disabled={isLoading}>
            {isLoading ? (
              <span className={styles.sendingText}>Sending</span>
            ) : (
              <span>Send</span>
            )}
          </button>
        </div>


        <div className={styles.buttonsContainer}>
          <button 
            className={styles.actionButton}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
              }
            }}
          >About Me</button>
          <button 
            className={styles.actionButton} 
            onClick={() => setIsCollapsed(true)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
              }
            }}
          >Projects</button>
        </div>
      </div>
    </div>
  );
}
