'use client';

import { useState } from 'react';
import styles from './ChatPanel.module.css';

export default function ChatPanel() {
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([
    { text: "Hi! I'm your AI assistant. How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        setMessages(prev => [...prev, { 
          text: data.text, 
          isUser: false 
        }]);
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
    <div className={styles.chatPanel}>
      <div className={styles.header}>
        <h1>Welcome to My Portfolio</h1>
        <p className={styles.subtitle}>Ask me anything about my work and experience</p>
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
        <button className={styles.actionButton}>About Me</button>
        <button className={styles.actionButton}>Projects</button>
      </div>
    </div>
  );
}
