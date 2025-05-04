import io from "socket.io-client";
import { useState, useEffect } from "react";
import "./chat.css"; // Importera CSS-fil för styling

const socket = io("http://localhost:3001");

interface Message {
  user: string;
  text: string;
}

function Chat() {
  const [name, setName] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [joined, setJoined] = useState<boolean>(false);

  const handleJoin = () => {
    socket.emit("join", { name }, (res: { error?: string }) => {
      if (res?.error) {
        alert(res.error);
      } else {
        setJoined(true);
      }
    });
  };

  useEffect(() => {
    socket.on("newMessage", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("history", (history: Message[]) => {
      setMessages(history);
    });

    return () => {
      socket.off("newMessage");
      socket.off("history");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() && room) {
      socket.emit("sendMessage", message);
      setMessage("");
    }
  };

  const handleChangeRoom = (newRoom: string) => {
    setRoom(newRoom);
    socket.emit("joinRoom", newRoom);
  };

  const clearChat = () => {
    setMessages([]);
    socket.emit("clearRoom", room);
  };

  const handleLogout = () => {
    setName("");
    setJoined(false);
    setMessages([]);
    setRoom("");
  };

  if (!joined) {
    return (
      <div className="chat-container">
        <div className="join-section">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ange ditt namn"
            className="input-name"
          />
          <button onClick={handleJoin} className="btn-join">
            Anslut
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="room-section">
        <h2 className="room-title">{room || "Ingen kanal vald"}</h2>
        <div className="room-buttons">
          <button
            onClick={() => handleChangeRoom("general")}
            className="btn-room"
          >
            General
          </button>
          <button
            onClick={() => handleChangeRoom("random")}
            className="btn-room"
          >
            Random
          </button>
        </div>
      </div>

      {room && (
        <div className="chat-window">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className="message">
                <strong>{m.user}</strong>: {m.text}
              </div>
            ))}
          </div>

          <div className="message-input">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Skriv meddelande..."
              className="input-message"
            />
            <button onClick={sendMessage} className="btn-send">
              Skicka
            </button>
          </div>
        </div>
      )}

      {!room && (
        <p className="warning-message">
          Vänligen välj en kanal innan du kan skriva meddelanden.
        </p>
      )}

      <div className="controls">
        <button onClick={clearChat} className="btn-clear">
          Rensa chatten
        </button>
        <button onClick={handleLogout} className="btn-logout">
          Byt konto
        </button>
      </div>
    </div>
  );
}

export default Chat;
