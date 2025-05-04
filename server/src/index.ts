import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

// Skapa express-app och http-server
const app = express();
const server = http.createServer(app);

// Skapa socket.io-servern
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // justera till frontend-port
    methods: ["GET", "POST"],
  },
});

// Spara historik per kanal
const messageHistory: { [key: string]: { user: string, text: string }[] } = {};

// Anslutna användare
const users = new Map<string, string>(); // socket.id -> användarnamn
const socketRooms: { [key: string]: string } = {}; // socket.id -> rum

const PORT = 3001;

io.on("connection", (socket) => {
  console.log("Ansluten:", socket.id);

  // Hantera när en användare ansluter
  socket.on("join", ({ name }, callback) => {
    if ([...users.values()].includes(name)) {
      return callback({ error: "Namnet är upptaget" });
    }
    users.set(socket.id, name);
    callback({ success: true });

    // Anslut användaren till standardkanalen (general)
    socket.join("general");
    socketRooms[socket.id] = "general"; // Sätt standardkanal för användaren

    // Skicka historik för kanal "general" om den finns
    if (messageHistory["general"]) {
      socket.emit("history", messageHistory["general"]);
    }
  });
  
  socket.on("clearRoom", (room) => {
    if (messageHistory[room]) {
      messageHistory[room] = []; // Rensa historik för rummet
    }
    io.to(room).emit("history", []); // Sänd tom historik till användarna i rummet
  });
  // Hantera när användaren byter kanal
  socket.on("joinRoom", (room) => {
    const oldRoom = socketRooms[socket.id];
    if (oldRoom) {
      socket.leave(oldRoom); // Lämna den gamla kanalen
    }
    socket.join(room); // Gå in i den nya kanalen
    socketRooms[socket.id] = room; // Uppdatera användarens aktuella kanal

    // Skicka historik för den nya kanalen
    if (messageHistory[room]) {
      socket.emit("history", messageHistory[room]);
    }
  });

  // Skicka meddelande
  socket.on("sendMessage", (msg) => {
    const name = users.get(socket.id) || "Okänd";
    const room = socketRooms[socket.id] || "general"; // Hämta användarens nuvarande kanal
    const message = { user: name, text: msg };

    // Spara meddelande i historiken för den aktuella kanalen
    if (!messageHistory[room]) {
      messageHistory[room] = [];
    }
    messageHistory[room].push(message);

    // Skicka meddelandet till alla i den aktuella kanalen
    io.to(room).emit("newMessage", message);
  });

  // När användaren kopplar från
  socket.on("disconnect", () => {
    const room = socketRooms[socket.id];
    if (room) {
      socket.leave(room); // Lämna kanalen
    }
    users.delete(socket.id);
    console.log("Frånkopplad:", socket.id);
  });
});

// Starta servern
server.listen(PORT, () => {
  console.log(`Servern kör på http://localhost:${PORT}`);
});
