const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);
//const client = redis.createClient('redis://h:1111@192.168.1.7:6379');
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);

module.exports = client;