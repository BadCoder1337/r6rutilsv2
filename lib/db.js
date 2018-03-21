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

module.exports.setUser = async function (id, user) {
    try {
        await client.setAsync('user_'+id, JSON.stringify(user));
    } catch(err) {
        throw err;
    }
}

module.exports.delUser = async function (id) {
    try {
        await client.delAsync('user_'+id);
    } catch(err) {
        throw err;
    }
}

module.exports.getServerSettings = async function (id) {
    try {
        return JSON.parse(await client.getAsync('guild_'+id));
    } catch(err) {
        throw err;
    }
}

module.exports.setServerSettings = async function (id, setting) {
    try {
        await client.setAsync('guild_'+id, JSON.stringify(setting));
    } catch(err) {
        throw err;
    }
}