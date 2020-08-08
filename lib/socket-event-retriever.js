const SocketEventStore = require("./socket-event-store");

class EventRetrieverIO {
  constructor(io, options) {
    this.io = io;
    this.options = options;
    this.eventStore = new SocketEventStore(options);

    // config io
    this._configIo();
  }

  _createEmit(bindObj) {
    const copiedEmit = bindObj.emit.bind(bindObj);
    // avoided event names
    // these names won't be included inside missed events in event stores
    const avoidedEventNames = ["connect", "connection"];
    return function (...emitArgs) {
      const [eventName, eventData] = emitArgs;
      // check if the event name is allowed
      if (avoidedEventNames.includes(eventName)) return copiedEmit(...emitArgs);

      const { room = "__general_room__", time } = io.latestEvent;
      const latestEvent = { room, eventName, eventData, time };
      // add to store
      eventStore.addEvent(latestEvent);
      // emit with normal socket.io event
      return copiedEmit(...emitArgs);
    };
  }

  _configIo() {
    // store latest event in io
    this.io.latestEvent = {};

    const copiedTo = this.io.bind(io);
    const namespace = copiedTo();
    const namespacePrototype = Object.getPrototypeOf(namespace);
    const ioPrototype = Object.getPrototypeOf(this.io);

    ioPrototype.emit = this._createEmit(this.io);
    namespacePrototype.emit = this._createEmit(namespace);

    ioPrototype.to = function (...toArgs) {
      const [room] = toArgs; // set latest room
      // save the event time to prevent duplicate actions
      io.latestEvent.room = room;
      io.latestEvent.time = Date.now();

      return copiedTo(...toArgs);
    };
  }

  setEventRetriever(socket) {
    // alter the join & leave methods
    const copiedJoin = socket.join.bind(socket);
    const copiedLeave = socket.leave.bind(socket);

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
        "__change_room_names",
        currentRoomNames.filter((name) => name !== roomName)
      );

      return copiedLeave(...leaveArgs);
    };

    // register an event for retrieval
    socket.on("__retrieve_missed_events__", async (socketRetrieveData) => {
      // if there is not socketRetrieveData that means it is the first connection
      if (!socketRetrieveData.rooms) return;

      const {
        rooms: socketRoomData,
        time: socketDisconnectTime,
      } = socketRetrieveData;

      // retrieve events by room name
      // send it to the socket
      for (const socketRoom of socketRoomData) {
        const filteredEvents = await this.eventStore.getElementsAfter(
          socketRoom,
          socketDisconnectTime
        );
        // send events to socket
        for (const missedEvent of filteredEvents) {
          const { eventName, eventData } = missedEvent;
          copiedTo(socket.id).emit(eventName, eventData);
        }
      }
    });
  }
}

class EventRetrieverClient {
  constructor(socket) {
    this.socket = socket;
  }

  setEventRetriever() {
    this.socket.on("connect", () => {
      const { __room_names__: rooms, __disconnect_time__: time } = socket;
      // emit retrieval event
      this.socket.emit("__retrieve_missed_events__", {
        rooms,
        time,
      });

      this.socket.on("__change_room_names__", (roomNames) => {
        this.socket.__room_names__ = [
          ...roomNames,
          socket.id,
          "__general_room__",
        ];
      });

      this.socket.on("disconnect", () => {
        this.socket.__disconnect_time__ = Date.now();
      });
    });
  }
}

module.exports = { EventRetrieverIO, EventRetrieverClient };
