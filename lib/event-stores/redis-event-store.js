const redis = require("redis");
const bluebird = require("bluebird");

// Promisify all the functions exported from node-redis
bluebird.promisifyAll(redis);

class RedisEventStore {
  constructor(options) {
    this.__options__ = options;
    this.__store__ = redis.createClient(options.redisConfig);
  }

  async getElementsAfter(key, time) {
    // prettier-ignore
    const elements = await this.__store__.zrangebyscoreAsync(key, time, Infinity);
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
    const strObj = this.convertObjtoStr(value);
    const { removeAfter } = this.__options__.cronOptions;
    const pipeline = this.__store__.batch();
    pipeline.zadd(key, value.time, strObj);
    if (removeAfter) {
      pipeline.pexpire(key, removeAfter);
    }
    await pipeline.execAsync();
  }

  async removeElement(key, index) {
    const [element] = await this.__store__.zrangeAsync(key, index, index + 1);
    await this.__store__.zremAsync(key, element);
  }

  // helpers
  convertObjtoStr(obj) {
    let str = "";
    const entries = Object.entries(obj);
    entries.forEach(
      ([key, value], index) =>
        (str += `${key}:${value}${index === entries.length - 1 ? "" : ":"}`)
    );
    return str;
  }

  convertStrToObj(str) {
    if (!str) return;
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
  initConfigs() {
    const revertHandlers = this.setEventHandlers();

    // return function to revert configs
    return () => {
      revertHandlers();
    };
  }

  // set error handlers to warn clients
  setEventHandlers() {
    const errorHandler = (error) => {
      throw new Error(error);
    };

    this.__store__.on("error", errorHandler);

    // return function to revert handlers back
    return () => this.__store__.off("error", errorHandler);
  }
}

module.exports = RedisEventStore;
