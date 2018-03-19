const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);

module.exports.getUser = async function (id) {
    try {
        let user = await client.getAsync('user_'+id);
        return JSON.parse(user);
    } catch(err) {
        throw err;
    }
};

module.exports.getServerSettings = async function (id) {
    try {
        let setting = await client.getAsync('guild_'+id);
        return JSON.parse(setting);
    } catch(err) {
        throw err;
    }
}