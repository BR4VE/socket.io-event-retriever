// import event stores

class SocketEventStore {
  constructor(
    EventStore,
    {
      stackCheck = true,
      stackCheckLimit = 500,
      timeCheck = false,
      timeCheckLimit = 1000 * 60 * 10, // 10 mins
    } = {},
    eventStoreOptions = {
      cronOptions: {
        checkEvery: "* */10 * * * *", // 10 mins
        removeAfter: 1000 * 60 * 10, // 10 mins of inactivity
      },
    }
  ) {
    this.__event_store__ = new EventStore(eventStoreOptions);
    this.__options__ = {
      stackCheck,
      stackCheckLimit,
      timeCheck,
      timeCheckLimit,
    };
    // set event_store configs
    this.revertConfigs = this.__event_store__.initConfigs();
  }

  async getElementsAfter(roomName, time) {
    return this.__event_store__.getElementsAfter(roomName, time);
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
      // if there isn't any first event return
      if (!firstEvent) return;
      // loop through events & remove
      if (firstEvent.time < lastEvent.time - timeCheckLimit) {
        // remove the event
        await this.__event_store__.removeElement(roomName, 0);
      }
    }
  }
}

module.exports = SocketEventStore;
