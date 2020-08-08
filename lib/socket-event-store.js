// import event stores
const BaseEventStore = require("./event-stores/base-event-store");

class SocketEventStore {
  constructor({
    stackCheck = false,
    stackCheckLimit = 100,
    timeCheck = true,
    timeCheckLimit = 1000 * 60 * 10, // 10 mins
    cronOptions = {
      checkEvery: "* */10 * * * *", // 10 mins
      removeAfter: 1000 * 60 * 10, // 10 mins of inactivity
    },
  } = {}) {
    this.__event_store__ = new BaseEventStore(cronOptions);
    this.__options__ = {
      stackCheck,
      stackCheckLimit,
      timeCheck,
      timeCheckLimit,
      removeDuplicates,
      cronOptions,
    };
    // set events
    this.initConfigs();
  }

  async getRoom(roomName) {
    return this.__event_store__.get(roomName) || [];
  }

  async addEvent(latestEvent) {
    const { room: roomName } = latestEvent;
    // check for & create availability
    await this.checkAndCreateSpace(roomName);
    // add the event
    await this.__event_store__.add(roomName, latestEvent);
  }

  async checkAndCreateSpace(roomName) {
    const {
      stackCheck,
      stackCheckLimit,
      timeCheck,
      timeCheckLimit,
    } = this.__options__;

    const storeLength = await this.__event_store__.getLength(roomName);

    if (stackCheck) {
      if (storeLength === stackCheckLimit) {
        // remove the oldest one
        await this.__event_store__.removeElement(roomName, 0);
      }
    } else {
      // filter with time limit
      const [firstEvent, lastEvent] = await Promise.all([
        this.__event_store__.getElement(roomName, 0),
        this.__event_store__.getElement(roomName, storeLength - 1),
      ]);
      // loop through events & remove
      if (firstEvent.time < lastEvent.time - timeCheckLimit) {
        // remove the event
        await this.__event_store__.removeElement(roomName, 0);
      }
    }
  }
}

module.exports = SocketEventStore;
