var redis = require('redis');
var client = redis.createClient(process.env.REDIS_URL);
//var client = redis.createClient('redis://h:1111@192.168.1.7:6379');
var bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);





module.exports = client; 