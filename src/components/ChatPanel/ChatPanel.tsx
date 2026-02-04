'use client';

import { useState } from 'react';
import styles from './ChatPanel.module.css';

export default function ChatPanel() {
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([
    { text: "Hi! I'm your AI assistant. How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, isUser: true }]);
      setInput('');
      
      // Simulate AI response (you'll replace this with actual AI integration later)
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: "I'm here to help! This is a placeholder response.", 
          isUser: false 
        }]);
      }, 1000);
    }
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.header}>
        <h1>Welcome to My Portfolio</h1>
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
      </div>

      <div className={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          className={styles.input}
        />
        <button onClick={handleSend} className={styles.sendButton}>
          Send
        </button>
      </div>

      <div className={styles.buttonsContainer}>
        <button className={styles.actionButton}>About Me</button>
        <button className={styles.actionButton}>Projects</button>
      </div>
    </div>
  );
}
