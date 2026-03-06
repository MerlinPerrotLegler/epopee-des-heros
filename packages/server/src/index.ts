import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import express from "express";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom.js";
import { GAME_CONFIG } from "@epopee/shared";

const port = Number(process.env.PORT) || GAME_CONFIG.serverPort;

const app = express();

// Colyseus monitor (admin dashboard)
app.use("/colyseus", monitor());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const httpServer = createServer(app);
const gameServer = new Server();

// Register game room
gameServer.define("game", GameRoom);

// Attach Colyseus to the HTTP server
gameServer.attach({ server: httpServer });

httpServer.listen(port, () => {
  console.log(`🏰 Épopée server listening on port ${port}`);
  console.log(`📊 Monitor: http://localhost:${port}/colyseus`);
});
