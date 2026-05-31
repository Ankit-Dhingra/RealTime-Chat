import { useState, useRef } from "react";

const OwnApp = () => {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [roomId, setRoomId] = useState("");

  const ws = useRef(null);
  const typingTimeout = useRef(null);

  function join() {
    ws.current = new WebSocket("ws://localhost:3000");
    console.log("Connecting to WebSocket server...");

    ws.current.onopen = () => {
      // ← pehle auth bhejo, join nahi
      ws.current.send(
        JSON.stringify({
          type: "auth",
          token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoiQW5raXQiLCJpYXQiOjE3ODAyNDUxMzF9.Rr7UgLAoKSUsAjWkwh_gkILpDc_dNAElYAXylIHq7k4",
        }),
      );
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "auth_success") {
        console.log("Connected to WebSocket server");
        ws.current.send(JSON.stringify({ type: "join", username, roomId }));
        setJoined(true);
        return;
      }

      // auth fail pe
      if (data.type === "auth_failed" || data.type === "token_expired") {
        alert(data.message);
        // redirect to login
        return;
      }
      if (data.type === "typing") {
        setTypingUsers((prev) => [...new Set([...prev, data.username])]);
      } else if (data.type === "stop_typing") {
        setTypingUsers((prev) => prev.filter((u) => u !== data.username));
      } else {
        if (data.onlineCount) setOnlineUsers(data.onlineCount);
        setMessages((prev) => [...prev, data]);
      }
    };
  }

  function sendMessage() {
    // yahan likh:
    // 1. wsRef.current se send karo
    ws.current.send(JSON.stringify({ type: "chat", message: input }));
    // ← yeh do lines add karo
    clearTimeout(typingTimeout.current);
    ws.current.send(JSON.stringify({ type: "stop_typing", username }));
    // 2. input clear karo
    setInput("");
  }

  function handleTyping() {
    // 1. typing bhejo server ko
    ws.current.send(
      JSON.stringify({ type: "typing", message: `${username} is typing...` }),
    );
    // 2. clearTimeout karo
    clearTimeout(typingTimeout.current);
    // 3. 2 seconds baad stopTyping bhejo
    typingTimeout.current = setTimeout(() => {
      ws.current.send(JSON.stringify({ type: "typing", username }));
      ws.current.send(JSON.stringify({ type: "stop_typing", username }));
    }, 2000);
  }

  if (!joined) {
    return (
      <div>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Room ID likho"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={join}>Join Chat</button>
      </div>
    );
  }
  return (
    <div>
      {/* online users count yahan dikhao */}
      <div>Online Users: {onlineUsers}</div>
      {/* messages list yahan dikhao */}
      {messages.map((msg, index) => (
        <div key={index}>
          {msg.type === "chat" && `${msg.username}: ${msg.message}`}
          {msg.type === "notification" && `🔔 ${msg.message}`}
        </div>
      ))}
      {typingUsers.length > 0 && (
        <div>{typingUsers.join(", ")} are typing...</div>
      )}
      {/* input aur send button yahan */}
      <input
        type="text"
        placeholder="Type a message"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          handleTyping();
        }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default OwnApp;
