import { useState } from "react";

function AIAssistantPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "m1",
      role: "ai",
      text: "Namaste! 🌾 I am FarmAI, your intelligent farming assistant. Ask me anything about your crops, soil, weather, or pest management in English or Hindi.",
      time: "9:41 AM",
    },
    {
      id: "m2",
      role: "user",
      text: "My paddy leaves have yellow spots. What should I do?",
      time: "9:42 AM",
    },
    {
      id: "m3",
      role: "ai",
      text: "Yellow spots on paddy leaves could indicate Leaf Blast (Magnaporthe oryzae) - especially given the recent humid conditions (85% RH).\n\nImmediate steps:\n1. Remove and burn affected leaves\n2. Apply Tricyclazole 75WP at 0.6g/litre\n3. Avoid excess nitrogen fertiliser\n4. Re-scan your crop in 5 days\n\nWould you like me to find the nearest agri-input supplier?",
      time: "9:42 AM",
    },
  ]);

  const suggestions = [
    "How to treat Leaf Blast?",
    "When should I irrigate?",
    "Best fertiliser for paddy?",
    "Pest forecast this week",
  ];

  const sendMessage = () => {
    if (!input.trim()) {
      return;
    }

    const newMsg = {
      id: `m-${Date.now()}`,
      role: "user",
      text: input.trim(),
      time: "Now",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  return (
    <section className="assistant-wrap">
      <div className="assistant-header">
        <div className="assistant-avatar">🤖</div>
        <div>
          <h3>FarmAI Assistant</h3>
          <p>• Online · Speaks English, Hindi, Tamil, Telugu & more</p>
        </div>
      </div>

      <div className="assistant-chat">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-row ${msg.role}`}>
            {msg.role === "ai" && <span className="chat-icon">🤖</span>}
            <div className={`chat-bubble ${msg.role}`}>
              <p>{msg.text}</p>
              <span>{msg.time}</span>
            </div>
            {msg.role === "user" && <span className="chat-icon">👤</span>}
          </div>
        ))}
      </div>

      <div className="assistant-suggestions">
        {suggestions.map((item) => (
          <button key={item} type="button" onClick={() => setInput(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="assistant-input">
        <button type="button" className="assistant-mic">
          🎙
        </button>
        <input
          type="text"
          value={input}
          placeholder="Ask anything about your farm..."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && sendMessage()}
        />
        <button type="button" className="assistant-send" onClick={sendMessage}>
          ➤
        </button>
      </div>
    </section>
  );
}

export default AIAssistantPanel;
