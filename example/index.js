const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { EventRetrieverIO } = require("../lib");

const app = express();

const server = http.createServer(app);
const io = socketIO(server);

const ioEventRetriever = new EventRetrieverIO(io);

io.on("connection", (socket) => {
  // put method to the top of the scope
  ioEventRetriever.setEventRetriever(socket);

  socket.join("some_room");

  socket.on("emitted_event", (data) => {
    io.to("some_room").emit("emitted_event");
  });
});

server.listen(5000, () => {
  console.log("connected to server");
});
