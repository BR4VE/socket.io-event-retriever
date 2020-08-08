const redis = require("redis");
const bluebird = require("bluebird");
const uniqid = require("uniqid");

// Promisify all the functions exported from node-redis
bluebird.promisifyAll(redis);

class RedisEventStore {
  constructor(redisConfig) {
    this.__store__ = redis.createClient(redisConfig);
  }

  async getElementsAfter(key, time) {
    const hashKeys = await this.__store__.zrangebyscore(key, time, Infinity);
    const pipeline = this.__store__.batch();
    hashKeys.forEach((hashKey) => {
      pipeline.hgetall(`${key}:${hashKey}`);
    });
    return pipeline.execAsync();
  }

  async getLength(key) {
    return this.__store__.zcardAsync(key);
  }

  async getElement(key, index) {
    const [hashKey] = await this.__store__.zrangeAsync(key, index, index + 1);
    const hash = await this.__store__.hgetallAsync(hashKey);
    return this.convertHashToObj(hash);
  }

  async add(key, value) {
    const uniqHashKey = uniqid();
    const objArr = await this.convertObjToArr(value);
    const transaction = this.__store__.multi();
    // add hash
    transaction.hmset(`${key}:${uniqHashKey}`, objArr);
    transaction.zadd(key, value.time);
    await transaction.execAsync();
  }

  async removeElement(key, index) {
    const [hashKey] = await this.__store__.zrangeAsync(key, index, index + 1);
    const pipeline = this.__store__.batch();
    pipeline.zrem(key, hashKey);
    pipeline.unlink(`${key}:${hashKey}`);
    await pipeline.execAsync();
  }

  // helpers
  async convertHashToObj(hash) {
    hash.time = +hash.time;
    return hash;
  }

  async convertObjToArr(obj) {
    const keyValues = [];
    Object.entries(obj).forEach(([key, value]) => keyValues.push(key, value));
    return keyValues;
  }

  // configs
  async initConfigs() {
    await this.setEventHandlers();
  }

  // set error handlers to warn clients
  async setEventHandlers() {
    this.__store__.on("error", (error) => {
      throw new Error(error);
    });
  }
}

module.exports = RedisEventStore;
