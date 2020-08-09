const redis = require("redis");
const bluebird = require("bluebird");
const uniqid = require("uniqid");

// Promisify all the functions exported from node-redis
bluebird.promisifyAll(redis);

class RedisEventStore {
  constructor(options) {
    this.__options__ = options;
    this.__store__ = redis.createClient(options.redisConfig);
  }

  async getElementsAfter(key, time) {
    const elements = await this.__store__.zrangebyscore(key, time, Infinity);
    return elements.map((element) => this.convertStrToObj(element));
  }

  async getLength(key) {
    return this.__store__.zcardAsync(key);
  }

  async getElement(key, index) {
    const [element] = await this.__store__.zrangeAsync(key, index, index + 1);
    return this.convertStrToObj(element);
  }

  async add(key, value) {
    const strObj = await this.convertObjtoStr(value);
    await this.__store__.zaddAsync(key, value.time, strObj);
  }

  async removeElement(key, index) {
    const [element] = await this.__store__.zrangeAsync(key, index, index + 1);
    await this.__store__.zremAsync(key, element);
  }

  // helpers
  async convertObjtoStr(obj) {
    let str = "";
    const entries = Object.entries(obj);
    entries.forEach(
      ([key, value], index) =>
        (str += `${key}:${value}${index === entries.length - 1 ? "" : ":"}`)
    );
    return entries;
  }

  async convertStrToObj(str) {
    let obj = {};
    const pairs = str.split(":");
    for (let i = 0; i < pairs.length; i += 2) {
      const key = pairs[i],
        value = pairs[i + 1];
      obj[key] = value;
    }
    return obj;
  }
  // configs
  async initConfigs() {
    const revertHandlers = await this.setEventHandlers();

    // return function to revert configs
    return () => {
      revertHandlers();
    };
  }

  // set error handlers to warn clients
  async setEventHandlers() {
    const errorHandler = (error) => {
      throw new Error(error);
    };

    this.__store__.on("error", errorHandler);

    // return function to revert handlers back
    return () => this.__store__.off("error", errorHandler);
  }
}

module.exports = RedisEventStore;
