import { useState, useRef } from "react";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoiQW5raXQiLCJpYXQiOjE3ODAyNDUxMzF9.Rr7UgLAoKSUsAjWkwh_gkILpDc_dNAElYAXylIHq7k4";

export default function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(0);

  const ws = useRef(null);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  function join() {
    ws.current = new WebSocket("ws://localhost:3000");

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: "auth", token: TOKEN }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "auth_success") {
        ws.current.send(JSON.stringify({ type: "join", username, roomId }));
        setJoined(true);
        return;
      }

      if (data.type === "auth_failed" || data.type === "token_expired") {
        alert(data.message);
        return;
      }

      if (data.type === "typing") {
        setTypingUsers((prev) => [...new Set([...prev, data.username])]);
        return;
      }

      if (data.type === "stop_typing") {
        setTypingUsers((prev) => prev.filter((u) => u !== data.username));
        return;
      }

      if (data.onlineCount) setOnlineUsers(data.onlineCount);
      setMessages((prev) => [...prev, data]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
  }

  function sendMessage() {
    if (!input.trim()) return;
    ws.current.send(JSON.stringify({ type: "chat", message: input }));
    clearTimeout(typingTimeout.current);
    ws.current.send(JSON.stringify({ type: "stop_typing", username }));
    setInput("");
  }

  function handleTyping(val) {
    setInput(val);
    ws.current.send(JSON.stringify({ type: "typing", username }));
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      ws.current.send(JSON.stringify({ type: "stop_typing", username }));
    }, 2000);
  }

  const styles = {
    wrap: { maxWidth: 480, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" },
    card: { border: "0.5px solid #e0e0e0", borderRadius: 12, overflow: "hidden", background: "#fff" },
    joinWrap: { padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: 12 },
    joinTitle: { fontSize: 16, fontWeight: 500, marginBottom: 4 },
    input: { fontSize: 13, padding: "8px 10px", borderRadius: 8, border: "0.5px solid #d0d0d0", background: "#f5f5f5", outline: "none", width: "100%" },
    joinBtn: { padding: 8, borderRadius: 8, border: "0.5px solid #d0d0d0", background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" },
    header: { padding: "12px 16px", borderBottom: "0.5px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" },
    avatar: { width: 32, height: 32, borderRadius: "50%", background: "#e6f1fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "#0c447c" },
    roomName: { fontSize: 14, fontWeight: 500, marginLeft: 8 },
    onlineBadge: { fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 4 },
    dot: { width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", display: "inline-block" },
    messages: { height: 320, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, background: "#f9f9f9" },
    notif: { fontSize: 12, color: "#aaa", textAlign: "center", padding: "2px 0" },
    msgWrap: (isSelf) => ({ display: "flex", flexDirection: "column", gap: 2, alignItems: isSelf ? "flex-end" : "flex-start" }),
    msgMeta: { fontSize: 11, color: "#aaa", padding: "0 4px" },
    bubble: (isSelf) => ({ background: isSelf ? "#e6f1fb" : "#fff", border: "0.5px solid #e0e0e0", borderRadius: isSelf ? "8px 8px 0 8px" : "0 8px 8px 8px", padding: "6px 10px", fontSize: 13, maxWidth: "85%" }),
    typingBar: { padding: "6px 16px", fontSize: 12, color: "#aaa", minHeight: 24, borderTop: "0.5px solid #e0e0e0" },
    inputRow: { padding: "10px 12px", borderTop: "0.5px solid #e0e0e0", display: "flex", gap: 8, alignItems: "center" },
    sendBtn: { width: 32, height: 32, borderRadius: 8, border: "0.5px solid #d0d0d0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 },
  };

  if (!joined) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.joinWrap}>
            <p style={styles.joinTitle}>Join a room</p>
            <input style={styles.input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input style={styles.input} placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
            <button style={styles.joinBtn} onClick={join}>Join chat →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={styles.avatar}>{username[0]?.toUpperCase()}</div>
            <span style={styles.roomName}>{roomId}</span>
          </div>
          <div style={styles.onlineBadge}>
            <span style={styles.dot} />
            {onlineUsers} online
          </div>
        </div>

        <div style={styles.messages}>
          {messages.map((msg, i) => {
            if (msg.type === "notification") {
              return <div key={i} style={styles.notif}>🔔 {msg.message}</div>;
            }
            const isSelf = msg.username === username;
            return (
              <div key={i} style={styles.msgWrap(isSelf)}>
                <div style={styles.msgMeta}>{isSelf ? "you" : msg.username}</div>
                <div style={styles.bubble(isSelf)}>{msg.message}</div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.typingBar}>
          {typingUsers.length > 0 && `${typingUsers.join(", ")} is typing...`}
        </div>

        <div style={styles.inputRow}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button style={styles.sendBtn} onClick={sendMessage}>→</button>
        </div>
      </div>
    </div>
  );
}