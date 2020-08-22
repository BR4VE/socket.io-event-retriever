<div align="center">
  <img src="./img/logo.png" alt="event-retriever-logo" width="300" >
</div>

# socket.io-event-retriever

socket.io-event-retriever is a helper built for and on top of socket.io to retrieve missed events by client. It can store the events emitted by server automatically and re-emits the ones the client has missed because of connection lost.

- It can store events based on time or event count
- It can detect connection lost and use it for later retrieval
- It can detect connection close (with socket.close() on client-side) and use it for later retrieval
- It can send the missed events only to socket which were disconnected
- It can auto delete events after certain amount of time to free up memory
- It can be used with Redis

## How does it work?

socket.io-event-retriever stores events which are sent from the server based on their room name. For example if the server emits an event called "Hello" to the room of "World", this event is saved into event-store so it can be used for later retrieval;

```js
// server.js
io.to("World").emit("Hello");
// This event is saved into the event store under "World" room
io.to("My_World").emit("Hello");
// This event is saved into the event store under "My_World" room
```

Later, if one of the clients gets disconnected by various reasons and gets reconnected, event-retriever will check the rooms this client was joined and re-emits events which the client missed during disconnection.

## Example Setup

### Server Side

```js
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { EventRetrieverIO } = require("../lib");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
// "options" can be provided to EventRetrieverIO as a second argument
const ioEventRetriever = new EventRetrieverIO(io);

io.on("connection", (socket) => {
  // put method to the top of the scope
  ioEventRetriever.setSocket(socket);

  socket.join("some_room");
  socket.on("emitted_event", (data) => {
    io.to("some_room").emit("emitted_event");
  });
});

server.listen(5000, () => {
  console.log("connected to server");
});
```

### Client Side

```js
const { EventRetrieverClient } = require("../lib");
const io = require("socket.io-client");
// initialize io
const socket = io("some.url");
// call eventRetriverClient with Socket
const socketEventRetriever = new EventRetrieverClient(socket);
// init retriever
socketEventRetriever.init();
```

## API

- EventRetrieverIO
- EventRetrieverClient

### EventRetrieverIO(io, options)

Accepts the top level io object (comes from socket.io), optional options argument and returns a retriever instance.

This method creates a storage to store events emitted from server side. Storage options can be changed by providing a _options_ argument.

The parameters of default _options_ object are listed below:

| Property        | Description                                                                                                                                                                                                                                                          | Default                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| stackCheck      | If it is true, stores the events like a stack and removes events one by one after the stackCheckLimit is exceeded                                                                                                                                                    | true                                                             |
| stackCheckLimit | The maximum count of stored events per room, it will be checked if stackCheck is enabled, for example if stackCheck is enabled it will store only the last 100 events emitted by server per room and when it becomes 101 it will delete the first event in that room | 500                                                              |
| timeCheck       | If it is true, stores events based on time                                                                                                                                                                                                                           | false                                                            |
| timeCheckLimit  | Miliseconds for timeCheck, which means for example if timeCheck is true and timeCheckLimit is 1000 \* 10, events which are older than (now - timeCheckLimit) will be removed                                                                                         | 1000 _ 60 _ 10                                                   |
| cronOptions     | An object which defines how frequently the rooms will be checked and after how many minutes of inactivity the rooms will be removed                                                                                                                                  | { checkEvery: "\* _/10 _ \* \* _", removeAfter: 1000 _ 60 \* 10} |

#### .setEventStore(storeName, storeConfig)

With _.setEventStore()_, default store which is used store events can be changed. By default socket.io-event-retriever uses local memory of Node.js process. If your services are served from multiple instances you can change default store to be consistent across different Node.js processes.

Currently socket.io-event-retirever only supports Redis but in the future it will support other in-memory databases.

```js
const ioEventRetriever = new EventRetrieverIO(io);
// set redis as event store
ioEventRetriever.setEventStore("redis", { host: "localhost", port: 6379 });
// set to default event store
ioEventRetriever.setEventStore("base");
```

# Todos

- Detect page reload on the front-end to retrieve events missed while page reload
- Write tests
- Release the library on npm
- Support other in-memory databases

# Contributers & Supporters

Special thanks to all contributers & supporters who helped me to release this library

<table>
  <tr>
    <td align="center">
        <a href="https://github.com/BR4VE">
            <img src="https://alt.bilgi.edu.tr/media/image/2019/11/27/mert-batmazoglu.jpeg" width="100px;" alt=""/>
            <br />
            <sub>
                <b>Mert Batmazoğlu</b>
            </sub>
        <br />
        <a href="https://github.com/BR4VE" title="github">Github</a>
    </td>
    <td align="center">
        <a href="https://github.com/Ardazafer">
            <img src="https://avatars2.githubusercontent.com/u/22233490?v=4" width="100px;" alt=""/>
            <br />
            <sub>
                <b>Arda Zafer İbin</b>
            </sub>
        <br />
        <a href="https://github.com/Ardazafer" title="github">Github</a>
    </td>
  </tr>
</table>
 
# Questions & Feedback
I would like to answer any questions raised based on this project and I would be so glad if you provide me any positive or negative feedback. You can contact me at mertbatmazoglu@gmail.com

## License

MIT
