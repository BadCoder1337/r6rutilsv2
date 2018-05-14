const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);

module.exports = client;