const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { eventRetrieverIO } = require("../lib");

const app = express();

const server = http.createServer(app);
const io = socketIO(server);

const { handleSocketRetrieval } = eventRetrieverIO(io);

io.on("connection", (socket) => {
  // handleSocketRetrival should be on top of the connection event
  handleSocketRetrieval(socket);

  socket.join("some_room");

  socket.on("emitted_event", (data) => {
    io.to("some_room").emit("emitted_event");
  });
});

server.listen(5000, () => {
  console.log("connected to server");
});
