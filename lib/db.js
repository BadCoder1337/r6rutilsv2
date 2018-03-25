var redis = require('redis');
var client = redis.createClient(process.env.REDIS_URL);
var bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);

// module.exports.getRaw = async function (key) {
//     try {
//         return await client.getAsync(key);
//     } catch(err) {
//         throw err;
//     }
// };

// module.exports.setRaw = async function (key, val) {
//     try {
//         await client.setAsync(key, val);
//         return;
//     } catch(err) {
//         throw err;
//     }
// }

// module.exports.exist = async function (key) {
//     try {
//         return await client.hgetallAsync(key);
//     } catch(err) {
//         return false;
//     }
// }

module.exports.cdRotaionPush = async function (id) {
    try {
        await client.lpushAsync('cooldown', id);
        return;
    } catch(err) {
        throw err;
    }
}

module.exports.cdRotaionPop = async function () {
    try {
        return await client.rpopAsync('cooldown');
    } catch(err) {
        throw err;
    }
}

// module.exports.getUser = async function (id) {
//     try {
//         let user = await client.getAsync('user_'+id);
//         return JSON.parse(user);
//     } catch(err) {
//         throw err;
//     }
// };

// module.exports.setUser = async function (id, user) {
//     try {
//         await client.setAsync('user_'+id, JSON.stringify(user));
//         return;
//     } catch(err) {
//         throw err;
//     }
// }

// module.exports.delUser = async function (id) {
//     try {
//         await client.delAsync('user_'+id);
//         return;
//     } catch(err) {
//         throw err;
//     }
// }

// module.exports.getServerSettings = async function (id) {
//     try {
//         return JSON.parse(await client.getAsync('guild_'+id));
//     } catch(err) {
//         throw err;
//     }
// }

// module.exports.setServerSettings = async function (id, setting) {
//     try {
//         await client.setAsync('guild_'+id, JSON.stringify(setting));
//         return;
//     } catch(err) {
//         throw err;
//     }
// }

module.exports = client; 