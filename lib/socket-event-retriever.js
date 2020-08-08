const SocketEventStore = require("./socket-event-store");

const eventRetrieverIO = (io, options) => {
  const eventStore = new SocketEventStore(options);

  function createEmit(bindObj) {
    const copiedEmit = bindObj.emit.bind(bindObj);

    // const avoided eventNames
    const avoidedEventNames = ["connect", "connection"];
    return function (...emitArgs) {
      const [eventName, eventData] = emitArgs;

      // check if the event is not allowed
      if (avoidedEventNames.includes(eventName)) return copiedEmit(...emitArgs);

      const { room = "__general_room__", time } = io.latestEvent;
      const latestEvent = {
        room,
        eventName,
        eventData,
        time,
      };

      // add to store
      eventStore.addEvent(latestEvent);

      return copiedEmit(...emitArgs);
    };
  }

  // object to store latest event
  io.latestEvent = {};

  const copiedTo = io.to.bind(io);
  const namespace = copiedTo();
  const namespacePrototype = Object.getPrototypeOf(namespace);
  const ioPrototype = Object.getPrototypeOf(io);

  ioPrototype.emit = createEmit(io);
  namespacePrototype.emit = createEmit(namespace);

  ioPrototype.to = function (...toArgs) {
    const [room] = toArgs; // set latest room
    // save the event time to prevent duplicate actions
    io.latestEvent.room = room;
    io.latestEvent.time = Date.now();

    return copiedTo(...toArgs);
  }; // set emit

  function handleSocketRetrieval(socket) {
    // alter the join & leave method
    const copiedJoin = socket.join.bind(socket);
    const copiedLeave = socket.leave.bind(socket);

    // avoid from manipulating the prototype as much as it can be
    socket.join = function (...joinArgs) {
      const currentRoomNames = Object.keys(socket.rooms);
      const [roomName] = joinArgs;

      // emit the room name
      socket.emit("__change_room_names__", [...currentRoomNames, roomName]);

      return copiedJoin(...joinArgs);
    };

    socket.leave = function (...leaveArgs) {
      const currentRoomNames = Object.keys(socket.rooms);
      const [roomName] = leaveArgs;

      socket.emit(
        "__change_room_names__",
        currentRoomNames.filter((name) => name !== roomName)
      );

      return copiedLeave(...leaveArgs);
    };

    // register an event for retrival
    socket.on("__retrieve_missed_events__", (socketRetrieveData) => {
      // that means it is the first connection
      if (!socketRetrieveData.rooms) return;

      const {
        rooms: socketRoomData,
        time: socketDisconnectTime,
      } = socketRetrieveData;

      // else retreive data by room name
      socketRoomData.forEach((socketRoom) => {
        // delegate all events to new socket
        const filteredEvents = eventStore
          .getRoom(socketRoom)
          .filter((event) => event.time > socketDisconnectTime);

        filteredEvents.forEach((missedEvent) => {
          const { eventName, eventData } = missedEvent;
          copiedTo(socket.id).emit(eventName, eventData);
        });
      });
    });
  }

  return { handleSocketRetrieval };
};

const eventRetrieverClient = (socket) => {
  socket.on("connect", () => {
    // if there is an item that means page is refreshed
    /*
    let localData = localStorage.getItem("__socket_reload_info__");
    localData = JSON.parse(localData);
    */
    const { __room_names__: rooms, __disconnect_time__: time } = socket;

    // emit retrival event
    socket.emit("__retrieve_missed_events__", {
      rooms,
      time,
    });
    // reset local data
    // localStorage.setItem("__socket_reload_info__", JSON.stringify({}));
  });

  socket.on("__change_room_names__", (roomNames) => {
    socket.__room_names__ = [...roomNames, socket.id, "__general_room__"];
  });

  socket.on("disconnect", () => {
    socket.__disconnect_time__ = Date.now();
  });

  /* 
  // Cannot detect page reload
  // listen for unload event
  window.addEventListener("beforeunload", (event) => {
    // Cancel the event as stated by the standard.
    event.preventDefault();
    // set the local storage
    localStorage.setItem(
      "__socket_reload_info__",
      JSON.stringify({
        __room_names__: socket.__room_names__,
        __disconnect_time__: Date.now(),
      })
    );
  });
  */
};

module.exports = { eventRetrieverIO, eventRetrieverClient };
