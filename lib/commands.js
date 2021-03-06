const r6db = require('./r6db');
const db = require('./db');
//const { parser, htmlOutput, toHTML } = require('discord-markdown');
const bluebird = require('bluebird');
const fs = bluebird.promisifyAll(require('fs'));
const ranks = [
    'Unranked',
    'Copper 4',
    'Copper 3',
    'Copper 2',
    'Copper 1',
    'Bronze 4',
    'Bronze 3',
    'Bronze 2',
    'Bronze 1',
    'Silver 4',
    'Silver 3',
    'Silver 2',
    'Silver 1',
    'Gold 4',
    'Gold 3',
    'Gold 2',
    'Gold 1',
    'Platinum 3',
    'Platinum 2',
    'Platinum 1',
    'Diamond'
]

function strTime(msec) {
    let answ = '**';
    let date = new Date(msec);
    if (date.getUTCDate() - 1) {
        answ += `${date.getUTCDate()-1} д. `
    }
    if (date.getUTCHours()) {
        answ += `${date.getUTCHours()} ч. `
    }
    if (date.getUTCMinutes()) {
        answ += `${date.getUTCMinutes()} м. `
    }
    if (date.getUTCSeconds()) {
        answ += `${date.getUTCSeconds()} с. `
    }
    return answ + '**';
}

async function deleteUser(id) {
    console.log('[User] <@303865473064239117> deleted');
    await db.delAsync('user_' + id);
    await db.lremAsync('cooldown', 0, id);
}

module.exports.deleteUser = deleteUser;

module.exports.reportError = async function (err, bot, msg) {
    try {
        let dm = bot.users.get(process.env.SUPPORT_ID);
        let code = Math.random().toString(36).substring(2, 6);
        if (msg) {
            msg.reply('произошла ошибка! Код: `' + code + '` (данные для поддержки)');
            dm.send(`[${msg.guild.name}, <#${msg.channel.id}>, <@${msg.author.id}>] ${msg.content}\n\`${code}\`: \`${err.name}\` \`\`\`JavaScript\n${err.stack}\`\`\` `)
        } else {
            // if (err.stack.includes('Stripped in prod')) {return code}
            dm.send(` \`${code}\`: \`${err.name}\` \`\`\`JavaScript\n${err.stack}\`\`\` `);
        }
        return code;
    } catch (error) {
        console.log('-----UNSEND ERROR-----')
        console.log(err.message);
        console.log(err.stack);
    }
}

async function rotateUsers() {
    try {
        let user = await db.rpoplpushAsync('cooldown', 'cooldown');
        return user;
    } catch (err) {
        throw err;
    }
}
module.exports.rotateUsers = rotateUsers;

module.exports.addGuild = async function (guild) {
    console.log('[Bot] Joining ' + guild.name);
    try {
        await db.hmsetAsync('guild_' + guild.id, ['Diamond', '', 'Platinum', '', 'Gold', '', 'Silver', '', 'Bronze', '', 'Copper', '', 'Unranked', '', 'diamondStab', 1]);
    } catch (err) {
        throw err;
    }
}

module.exports.removeGuild = async function (guild) {
    console.log('[Bot] Leaving ' + guild.name);
    try {
        await db.delAsync('guild_' + guild.id);
    } catch (err) {
        throw err;
    }
}

module.exports.banGenome = async function (guild, user) {
    console.log('[Bot] Banning by Uplay genome '+user.tag);
    try {
        let genome = await db.hgetAsync('user_' + user.id, 'genome');
        if (genome) db.zaddAsync('guild_' + guild.id + '_banlist', 0, genome);
    } catch (err) {
        throw err;
    }
}

module.exports.unbanGenome = async function (guild, id) {
    console.log('[Bot] Unbanning by Uplay genome <@'+id+'>');
    try {
        let genome = await db.hgetAsync('user_' + id, 'genome');
        if (!genome) {
            return 'пользователь не найден!';
        }
        db.zremAsync(`guild_${guild.id}_banlist`, genome);
        return 'пользователь разбанен!';

    } catch (err) {
        throw err;
    }
}

module.exports.formPack = async function () {
    try {
        let pack = {ids: [], genomes: []};
        for (let i = 0; i < process.env.PACK_SIZE; i++) {
            let id = await rotateUsers();
            let genome = await db.hgetAsync('user_' + id, 'genome');
            pack.ids.push(id);
            pack.genomes.push(genome);
        }
        return pack;
    } catch (err) {
        throw err;
    }
}

module.exports.checkPayment = async function (guildId) {
    return await db.hgetAsync('guild_' + guildId, 'payed');
}

module.exports.getRanks = r6db.getRanks;

module.exports.update = async function (bot, guilds, id, genome, rank) {
    try {
        console.log(`[Rank] Updating ${bot.users.get(id).tag}`);
        let dm = bot.users.get(id);
        guilds.forEach(async (g) => {
            try {

                if (!await db.hgetAsync('guild_' + g.id, 'payed')) {
                    return;
                }

                if (await db.zrankAsync('guild_' + g.id + '_banlist', genome) != null) {
                    g.owner.send(`Аккаунт Uplay https://r6tab.com/${genome} пользователя <@${id}> находится в черном списке сервера ${g.name}.`);
                }

                let rolesDB = await db.hgetallAsync('guild_' + g.id);
                let member = await g.fetchMember(bot.users.get(id));
                if (!(rolesDB.diamondStab == '1' & !!member.roles.get(rolesDB.Diamond)) || rank == 0) {

                    let guildRoles = g.roles;

                    let roles = [];
                    Object.keys(rolesDB).forEach(e => {
                        let r = guildRoles.get(rolesDB[e]);
                        roles.push(r);
                    });
                    let r = guildRoles.get(rolesDB[ranks[rank].split(' ')[0]]);
                    if (member.roles.array().includes(r)) {
                        return
                    };
                    await member.removeRoles(roles, 'Удаляю роли перед обновлением...');
                    if (r) {
                        await member.addRole(r, '...готово!');
                    }
                }

            } catch (err) {
                if (err.message != 'Unknown Role') {
                    throw err;
                }
            }
        });
    } catch (err) {
        throw err;
    }
}

module.exports.rank = async function (bot, msg, nick) {
    let waitmsg;
    let timer;
    try {
        console.log(`[Rank] Registering ${msg.author.tag}, nick ${nick}`);
        let guildRoles = msg.channel.guild.roles;
        let member = msg.member;
        let exist = await db.hgetAsync('user_' + member.id, 'genome');
        let answ = '';
        if (!exist & !!nick) {
            if (nick.length > 15 || nick.length < 3 || /[^\w-\.]/g.test(nick)) {
                return 'укажите корректный ник Uplay!';
            }
            timer = setTimeout(async () => {
                waitmsg = await msg.reply('сбор данных с серверов Ubisoft занимает больше времени, чем обычно. Пожалуйста подождите.');
            }, 5000);
            let genome = await r6db.getGenome(nick);
            let raw = await r6db.getStats(genome);
            if (!raw.length) {clearTimeout(timer); if (waitmsg) {waitmsg.delete()}; return 'данный аккаунт не имеет Rainbow Six Siege'}
            let stats = raw[0].general;
            clearTimeout(timer); if (waitmsg) {waitmsg.delete()}
            let confirm = await msg.reply(`игрок с ником **${nick}** найден, это ваш профиль?\nНажмите реакцию под сообщением для подтверждения`, {
                "embed": {
                  "description": "Общая статистика",
                  "url": `https://r6tab.com/${genome}`,
                  "thumbnail": {
                    "url": `https://ubisoft-avatars.akamaized.net/${genome}/default_146_146.png`
                  },
                  "author": {
                    "name": nick
                  },
                  "fields": [
                    {
                      "name": "Выигрыши/Поражения",
                      "value": `**В:** ${stats.won || 0} **П:** ${stats.lost || 0}\n**В%:** ${(100*(stats.won/(stats.won+stats.lost) || 0)).toFixed(2)}%`,
                      "inline": true
                    },
                    {
                      "name": "Убийства/Смерти",
                      "value": `**У:** ${stats.kills || 0} **С:** ${stats.deaths || 0}\n**У/С:** ${(stats.kills/(stats.deaths || 1)).toFixed(2)}`,
                      "inline": true
                    }
                  ]
                }
              });
            await confirm.react('✅');
            await confirm.react('❎');

            let filter = (reaction, user) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❎') && user.id === member.id;
            let res = await confirm.awaitReactions(filter, { maxEmojis: 1, time: 5*60*1000 });
            if (res.array().length == 0) {
                confirm.delete(5000);
                return 'время на подтверждение истекло. Попробуйте еще раз и нажмите реакцию для подтверждения.'
            } else if (res.first().emoji.name != '✅') {
                confirm.delete(5000);
                return 'вы отклонили регистрацию. Попробуйте снова, указав нужный аккаунт.'
            }
            confirm.delete(5000);

            var rank = await r6db.getRank(genome);

            if (await db.zrankAsync('guild_' + msg.channel.guild.id + '_banlist', genome) != null) {
                msg.channel.guild.owner.send(`Аккаунт Uplay https://r6tab.com/${genome} пользователя <@${member.id}> находится в черном списке сервера ${msg.channel.guild.name}.`);
            }

            await db.hsetAsync('user_' + member.id, 'genome', genome);
            await db.lpushAsync('cooldown', member.id);

            let rolesDB = await db.hgetallAsync('guild_' + msg.guild.id);

            let roles = [];
            Object.keys(rolesDB).forEach(e => {
                let r = guildRoles.get(rolesDB[e]);
                roles.push(r);
            });

            await member.removeRoles(roles, 'Удаляю старые роли перед регистрацией...');

            let r = guildRoles.get(rolesDB[ranks[rank].split(' ')[0]]);
            if (r) {
                await member.addRole(r, 'пользователь зарегистрирован');
                answ = `вы успешно зарегистрировались! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``;
            } else {
                answ = `вы успешно зарегистрировались, но для вашего ранга в игре роль не предусмотрена! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``
            }
        } else if (exist) {
            let llen = await db.llenAsync('cooldown');
            answ = 'вы уже зарегистрированы, бот обновляет ваш ранг автоматически с периодом ' + strTime(Math.round(llen * (process.env.COOLDOWN)/process.env.PACK_SIZE)) + ' (' + llen + ' польз.)';
            if (nick) {
                answ += `\n\n*для смены ника посетите https://r6rutils.herokuapp.com*`
            }
        } else if (!nick) {
            answ = 'вы не указали ник в Uplay!';
        }
        return answ;
    } catch (err) {
        clearTimeout(timer); if (waitmsg) {waitmsg.delete()}
        console.log(err.stack);
        switch (err.name) {
            case 'AuthorizationError':
            case 'RequestError':
            case 'ParseError':
                return 'нет доступа к серверам игровой статистики!';
            case 'WrongNickname':
                return 'пользователь с ником `' + nick + '` в Uplay не найден!';
            case 'DiscordAPIError':
                return `вы успешно зарегистрировались, но для вашего ранга в игре роль не предусмотрена! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``;
            case 'TypeError':
                return `произошла ошибка Discord! Если вы находитесь в режиме "Невидимка", то выйдите из него и попробуйте еще раз.`;
            default:
                throw err;
        }
    }
}

module.exports.register = async function (id, nick) {
    try {
        let exist = await db.existsAsync('user_' + id);
        let answ = '';
        if (!exist & !!nick) {
            let genome = await r6db.getGenome(nick);
            let rank = await r6db.getRank(genome);
            await db.hsetAsync('user_' + id, 'genome', genome);
            await db.rpushAsync('cooldown', id);
            answ = `пользователь <@${id}> зарегистрирован под ником \`${nick}\``;
        } else if (exist) {
            answ = 'пользователь уже зарегистрирован!';
        } else if (!nick) {
            answ = 'укажите ник!';
        }
        return answ;
    } catch (err) {
        throw err;
    }
}

module.exports.unregister = async function (bot, msg, id) {
    try {
        let guildRoles = msg.channel.guild.roles;
        let user = await bot.fetchUser(id);

        if (!await db.existsAsync('user_' + id)) {
            return 'пользователь не зарегистрирован!';
        }

        deleteUser(id);

        let roles = [];
        let rolesDB = await db.hgetallAsync('guild_' + msg.guild.id);
        Object.keys(rolesDB).forEach(e => {
            let r = guildRoles.get(rolesDB[e]);
            roles.push(r);
        })

        let answ = `пользователь ${user.tag} удален`;

        try {
            let member = await msg.channel.guild.fetchMember(user);
            await member.removeRoles(roles, answ);
        } catch (err) {
            console.log(err);
        }
        return answ;
    } catch (err) {
        throw err;
    }
}

module.exports.info = async function (id) {
    try {
        let genome = await db.hgetAsync('user_' + id, 'genome');
        if (genome) {
            return `профиль: https://r6tab.com/${genome}`;
        } else {
            return 'пользователь не зарегистрирован или вы его не упомянули через @'
        }
    } catch (err) {
        throw err;
    }
}

module.exports.stats = async function (g) {
    try {
        let answ = `статистика пользователей на *${g.name}:*\n`;
        let roles = [];
        let rolesDB = await db.hgetallAsync('guild_' + g.id);
        Object.keys(rolesDB).forEach(e => {
            if (['diamondStab', 'payed'].includes(e)) {
                return;
            }
            let r = g.roles.get(rolesDB[e]);
            roles.push(r);
        })
        roles.forEach((e, i) => {
            if (e.name == '@everyone') {
                return;
            }
            answ += `**${Object.keys(rolesDB)[i]}**: \`${e.members.array().length}\`\n`
        });
        answ += `**Всего зарегистрировано**: \`${await db.llenAsync('cooldown')}\``
        return answ;
    } catch (err) {
        throw err;
    }
}

module.exports.help = async function () {
    try {
        let answ = await fs.readFileAsync('./lib/text/help.txt', 'utf8');
        return answ;
    } catch (err) {
        throw err;
    }
}

module.exports.massban = async (content, guild) => {
    try {
        const reason = content.split(' ')[1];
        const rawBanlist = content.replace(`${process.env.PREFIX}massban ${reason} `, '').replace(/<@/g, '').replace(/>/g, '')
        let banlist = [];
        if (rawBanlist[0].match(/\d/g)) {
            banlist = rawBanlist.split(' ');
        } else {
            const splitter = /.+?(?=\d)/s.exec(rawBanlist)[0];
            banlist = rawBanlist.slice(splitter.length).split(splitter)
        }
        if (banlist.some(e=>e.length > 19 || e.match(/[^\d]/s))) {
            return 'неправильный разделитель'
        } else {
            banlist.forEach(e=>guild.ban(e,reason))
            return `${banlist.length} пользователей забанено по причине ${reason}`
        }
    } catch (err) {
        throw err;
    }
}

module.exports.reverseinfo = async (nick, bot) => {
    try {
        if (nick.length > 15 || nick.length < 3 || /[^\w-\.]/g.test(nick)) {
            return 'укажите корректный ник Uplay!';
        }
        const genome = await r6db.getGenome(nick);
        const userList = (await db.keysAsync('user_*')).map(e => e.slice(5));
        let userPool = [];
        let dbRequests = [];
        userList.forEach(u => {
            dbRequests.push(db.hgetAsync('user_' + u, 'genome'));
            userPool.push(u)
        });
        const userGens = await Promise.all(dbRequests);
        let discordTags = [];
        userPool.filter((e, i) => userGens[i] == genome).forEach(id => discordTags.push(bot.fetchUser(id)));
        const discordUsers = await Promise.all(discordTags)
        if (discordUsers.length) {
            return `найдено \`${discordUsers.length}\` пользователей\n${discordUsers.map(e => `<@${e.id}>, \`${e.tag}\`\n`)}`
        } else {
            return `пользователь с Uplay \`${nick}\` в Discord не найден`
        }
    } catch (err) {
        throw err;
    }
}

module.exports.countTwinks = async (channel, bot) => {
    try {
        const userList = (await db.keysAsync('user_*')).map(e => e.slice(5));
        const userPool = [];
        const dbRequests = [];
        userList.forEach(u => {
            dbRequests.push(db.hgetAsync('user_' + u, 'genome'));
            userPool.push(u)
        });
        const userGens = await Promise.all(dbRequests);
        const answ = Object.entries(userPool.map((e, i) => ({count: 1, genome: userGens[i], id: e})).reduce((a, b) => {
            a[b.genome] = (a[b.genome] || 0) + b.count;
            return a;
        }, {})).filter(e => e[1] > 1).filter(e => e[0] !== 'null').map(e => [userPool.filter((id, i) => userGens[i] === e[0]), ...e]); // .forEach(id => discordTags.push(bot.fetchUser(id)));
        const bans = await channel.guild.fetchBans();
        await channel.send((await Promise.all(answ.map(async (i) => {
            const uplayBan = await db.zrankAsync('guild_' + channel.guild.id + '_banlist', i[1]) != null;
            return `Uplay <https://r6tab.com/${i[1]}>${uplayBan ? ' <:ban:544254582637723679>' : ''} привязан:\n    ${(await Promise.all(i[0].map(async (id) => {try {
                const user = await bot.fetchUser(id);
                return `<@${id}> \`${user.tag}\`${bans.has(id) ? ' <:ban:544254582637723679>' : ''}`
            } catch (err) {
                console.log(id, err)
            }}))).join('\n    ')}`
        }))).join('\n•'), {split: true});
        return `найдено ${answ.reduce((a, b) => {
            return a + b[0].length
        }, 0)} твинков`
    } catch (err) {
        throw err;
    }
}

