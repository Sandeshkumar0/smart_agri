import { useEffect, useRef, useState } from "react";

const DEFAULT_GREETING = "Namaste. Main FarmAI hoon. Pest, paani, khad, fasal guide ya sarkari yojana pucho.";

const formatTime = (raw = "") => {
  if (!raw) return "Now";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const buildResources = (payload = {}) => {
  const resources = [];

  const videoQuery = String(payload?.video_query || "").trim();
  if (videoQuery) {
    const isDirectUrl = /^https?:\/\//i.test(videoQuery);
    resources.push({
      label: "Recommended Video",
      url: isDirectUrl
        ? videoQuery
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`,
    });
  }

  if (Array.isArray(payload?.sources)) {
    payload.sources.forEach((item, index) => {
      const name = String(item?.name || `Source ${index + 1}`).trim();
      const url = String(item?.url || "").trim();
      if (url && /^https?:\/\//i.test(url)) {
        resources.push({ label: name, url });
      }
    });
  }

  return resources;
};

const toUiRole = (rawRole = "") => (String(rawRole || "").toLowerCase() === "assistant" ? "ai" : "user");

function AIAssistantPanel() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [banner, setBanner] = useState("");
  const [messages, setMessages] = useState([
    { id: "m-greeting", role: "ai", text: DEFAULT_GREETING, time: "Now" },
  ]);
  const threadRef = useRef(null);

  const suggestions = [
    "Mere gehu me keeda lag gaya, kya karu?",
    "Dhaan me paani kab dena hai?",
    "Urea kitni maatra me daalein?",
    "PM Kisan kaise milega?",
  ];

  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(`${apiBase}/frontend/assistant`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load assistant history");
        }

        const items = Array.isArray(payload?.messages) ? [...payload.messages].reverse().slice(0, 16) : [];
        if (items.length === 0) {
          return;
        }

        const mapped = items.map((item, index) => ({
          id: String(item?.id || `hist-${index}`),
          role: toUiRole(item?.role),
          text: String(item?.text || "").trim() || DEFAULT_GREETING,
          time: formatTime(item?.createdAt),
        }));
        setMessages(mapped);
      } catch (error) {
        setBanner(`History load issue: ${error.message}`);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [apiBase]);

  const sendMessage = async (forcedText = "") => {
    const text = String(forcedText || input || "").trim();
    if (!text || sending) return;

    setSending(true);
    setBanner("");

    const nowId = Date.now();
    const typingId = `typing-${nowId}`;
    const userMsg = { id: `u-${nowId}`, role: "user", text, time: "Now" };

    setMessages((prev) => [...prev, userMsg, { id: typingId, role: "ai", text: "Soch raha hoon...", time: "Now" }]);
    setInput("");

    try {
      const response = await fetch(`${apiBase}/frontend/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Chat request failed");
      }

      const ai = payload?.assistant || {};
      const aiText =
        String(ai?.text || "").trim() ||
        String(payload?.payload?.reply || "").trim() ||
        "Server se answer empty aaya, dubara pucho.";

      const fallbackInfo = payload?._fallback ? `Backend fallback active: ${payload?._error || "unknown error"}` : "";
      if (fallbackInfo) setBanner(fallbackInfo);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? {
                id: String(ai?.id || `a-${Date.now()}`),
                role: "ai",
                text: aiText,
                time: "Now",
                resources: buildResources(payload?.payload),
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? {
                id: `err-${Date.now()}`,
                role: "ai",
                text: `Server issue: ${error.message}`,
                time: "Now",
              }
            : msg
        )
      );
      setBanner(`Send failed: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <section className="assistant-shell">
      <div className="assistant-welcome">
        <h3>Welcome, what do you want to work on?</h3>
      </div>

      {banner ? <div className="assistant-system-banner">{banner}</div> : null}

      <div className="assistant-thread" ref={threadRef}>
        {loadingHistory ? <div className="assistant-loading">Loading previous chats...</div> : null}

        {messages.map((msg) => (
          <div key={msg.id} className={`assistant-msg ${msg.role}`}>
            <div className="assistant-msg-meta">{msg.role === "ai" ? "FarmAI" : "You"}</div>
            <p>{msg.text}</p>
            {Array.isArray(msg.resources) && msg.resources.length > 0 && (
              <div className="assistant-msg-links">
                {msg.resources.map((resource) => (
                  <a
                    key={`${msg.id}-${resource.url}`}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="assistant-msg-link"
                  >
                    {resource.label}
                  </a>
                ))}
              </div>
            )}
            <span>{msg.time}</span>
          </div>
        ))}
      </div>

      <div className="assistant-composer">
        <div className="assistant-composer-top">
          <input
            type="text"
            value={input}
            placeholder="Ask FarmAI anything..."
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && sendMessage()}
          />
          <button type="button" className="assistant-send-btn" onClick={() => sendMessage()} disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>

        <div className="assistant-actions">
          {suggestions.map((item) => (
            <button key={item} type="button" className="assistant-action-chip" onClick={() => sendMessage(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AIAssistantPanel;
