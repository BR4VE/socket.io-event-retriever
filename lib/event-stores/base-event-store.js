const CronJob = require("cron").CronJob;

class BaseEventStore {
  constructor(options) {
    this.__options__ = options;
    this.__store__ = new Map();
  }

  // public methods
  async getElementsAfter(key, time) {
    const collection = await this.get(key);
    return collection.filter(elem => elem.time > time);
  }

  async getLength(key) {
    const collection = await this.get(key);
    return collection.length;
  }

  async getElement(key, index) {
    const collection = await this.get(key);
    return collection[index];
  }

  async add(key, value) {
    const collection = await this.get(key);
    collection.push(value);
    return this._set(key, collection);
  }

  async removeElement(key, index) {
    const collection = await this.get(key);
    collection.splice(index, 1);
    return this._set(key, collection);
  }

  // private methods
  async _set(key, value) {
    return this.__store__.set(key, value);
  }

  async _remove(key) {
    return this.__store__.delete(key);
  }

  // configs
  async initConfigs() {
    const revertCronJobs = await this.initCronJobs();
    // return function to revert config
    return () => {
      revertCronJobs();
    }
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
          await this._remove(key);
        }
      }
    });
    cleanJob.start();

    // return func to revert cron jobs
    return () => cleanJob.stop();
  }
}

module.exports = BaseEventStore;
