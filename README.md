<div align="center">
  <img src="./img/logo.png" alt="event-retriever-logo" width="300" >
</div>

# socket.io-event-retriever

socket.io-event-retriever is a helper built for and on top of socket.io to retrieve missed events by client. It can store the events emitted by server automatically and re-emits the ones the client has missed because of connection lost

- It can store events based on time or event count
- It can detect connection lost and use it for later retrieval
- It can detect connection close (with socket.close() on client-side) and use it for later retrieval
- It can send the missed events only to socket which were disconnected
- It can auto delete events after certain amount of time to free up memory

## Example Setup

### Server Side

```js
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { eventRetrieverIO } = require("../lib");

const app = express();

const server = http.createServer(app);
const io = socketIO(server);

// "options" can be provided to eventRetrieverIO as a second argument
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
```

### Client Side

```js
const { eventRetrieverClient } = require("../lib");
const io = require("socket.io-client");

// initialize io
const socket = io("some.url");

// call eventRetriverClient with Socket
eventRetrieverClient(socket);
```

## API

- eventRetrieverIO
- eventRetrieverClient

### eventRetrieverIO(io, options)

eventRetrieverIO accepts the top level io object (comes from socket.io), optional options argument and returns a function for later usage

```js
const { handleSocketRetrieval } = eventRetrieverIO(io, options);
```

This method creates a storage to store events emitted from server side. Storage options can be changed by providing a _options_ argument.

The parameters of default _options_ object are listed below:

| Property Name   | Default Value                                                                               | Description                                                                                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stackCheck      | false                                                                                       | If it is true, stores the events like a stack and removes events one by one after the stackCheckLimit is exceeded                                                                                                                                                                                                             |
| stackCheckLimit | 100                                                                                         | The maximum count of stored events, it will be checked if stackCheck is enabled, for example if stackCheck is enabled it will store only the last 100 events emitted by server and when it becomes 101 it will delete the first event                                                                                         |
| timeCheck       | true                                                                                        | If it is true, stores events based on time                                                                                                                                                                                                                                                                                    |
| timeCheckLimit  | 600000 (10 minutes in milisecs)                                                             | It will be checked if timeCheck is enabled, for example if timeCheck is enabled it will store the events which were emitted in last 10 minutes                                                                                                                                                                                |
| cronOptions     | { checkEvery: "\* \_/10 \* \* \*" (cron time), removeAfter: 600000 (10 minutes in milisec)} | cronOptions is an object which has two properties. checkEvery determines that how often the storage will be checked to remove old events to free up memory and removeAfter determines the events which will be removed. In this example the storage will be checked in every 10 mins and remove all events older than 10 mins |

### eventRetrieverClient(socket)

Accepts a socket object and detect connection losts by internet loss and connection loss on purpose (by using socket.close())

```js
eventRetrieverClient(socket);
```

# Todos

- Detect page reload on the front-end to retrieve events missed while page reload
- Write tests
- Release the library on npm

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
