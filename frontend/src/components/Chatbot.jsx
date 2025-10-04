import React, { useState } from 'react';
import './Chatbot.css';
import '../App.css'; // Import styles

function Chatbot({ messages, onSendMessage }) {
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      <div className="message-area">
        {messages.length === 0 && (
          <div className="chatbot-placeholder">
            Start a conversation with your Health Assistant!
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-bubble ${msg.sender === 'user' ? 'user' : 'bot'}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input-field"
          placeholder="Type your message..."
        />
        <button
          onClick={handleSendMessage}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chatbot;