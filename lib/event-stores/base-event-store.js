const CronJob = require("cron").CronJob;

class BaseEventStore {
  constructor() {
    this.__options__ = { cronOptions };
    this.__store__ = new Map();
  }

  async get(key) {
    return this.__store__.get(key);
  }

  async getLength(key) {
    const collection = await this.get(key);
    return collection.length;
  }

  async getElement(key, index) {
    const collection = await this.get(key);
    return collection[index];
  }

  async set(key, value) {
    return this.__store__.set(key, value);
  }

  async add(key, value) {
    const collection = await this.get(key);
    collection.push(value);
    return this.set(key, collection);
  }

  async remove(key) {
    return this.__store__.delete(key);
  }

  async removeElement(key, index) {
    const collection = await this.get(key);
    collection.splice(index, 1);
    return this.set(key, collection);
  }
  // configs
  async initConfigs() {
    await this.initCronJobs();
  }
  // set crons to remove unused rooms
  async initCronJobs() {
    const { cronOptions } = this.__options__;
    const cleanJob = new CronJob(cronOptions.checkEvery, () => {
      // check last element of every room
      for (const [key, eventArr] of this.__store__) {
        const lastEvent = await this.getElement(key, eventArr.length - 1);
        // if is inactive
        if (lastEvent.time < Date.now() - cronOptions.removeAfter) {
          // reset whole key
          await this.remove(key);
        }
      }
    });
    cleanJob.start();
  }
}

module.exports = BaseEventStore;
