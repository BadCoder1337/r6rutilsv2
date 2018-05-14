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
    console.log('[Bot] Banning by Uplay genome');
    try {
        let genome = await db.hgetAsync('user_' + user.id, 'genome');
        db.zaddAsync('guild_' + guild.id + '_banlist', 0, genome);
    } catch (err) {
        throw err;
    }
}

module.exports.unbanGenome = async function (guild, id) {
    console.log('[Bot] Unbanning by Uplay genome');
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
        //let genome = await db.hgetAsync('user_' + id, 'genome');

        //let rank = await r6db.getRank(genome);
        let dm = bot.users.get(id);
        guilds.forEach(async (e) => {
            try {

                if (!await db.hgetAsync('guild_' + e.id, 'payed')) {
                    return;
                }

                if (await db.zrankAsync('guild_' + e.id + '_banlist', genome) != null) {
                    e.owner.send(`Аккаунт Uplay https://r6db.com/player/${genome} пользователя <@${id}> находится в черном списке сервера ${e.name}.`);
                }

                let rolesDB = await db.hgetallAsync('guild_' + e.id);
                let member = e.member(bot.users.get(id));
                if (!(rolesDB.diamondStab == '1' & !!member.roles.get(rolesDB.Diamond)) || rank == 0) {

                    let guildRoles = e.roles;

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
            let genome = await r6db.getGenome(nick);

            let confirm = await msg.reply(`игрок с ником **${nick}** найден, это ваш профиль https://r6db.com/player/${genome}?\nНажмите реакцию ниже:`);
            await confirm.react('✅');
            await confirm.react('❎');

            let filter = (reaction, user) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❎') && user.id === member.id;
            let res = await confirm.awaitReactions(filter, { maxEmojis: 1, time: 60000 });
            if (res.array().length == 0 || res.first().emoji.name !== '✅') {
                confirm.delete(5000);
                return 'вы отклонили регистрацию. Попробуйте снова, указав верный аккаунт.'
            }
            confirm.delete(5000);

            var rank = await r6db.getRank(genome);

            if (await db.zrankAsync('guild_' + msg.channel.guild.id + '_banlist', genome) != null) {
                msg.channel.guild.owner.send(`Аккаунт Uplay https://r6db.com/player/${genome} пользователя <@${member.id}> находится в черном списке сервера ${msg.channel.guild.name}.`);
            }

            await db.hsetAsync('user_' + member.id, 'genome', genome);
            await db.lpushAsync('cooldown', member.id);

            let rolesDB = await db.hgetallAsync('guild_' + msg.guild.id);


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
            answ = 'укажите ник в Uplay!';
        }
        return answ;
    } catch (err) {
        switch (err.name) {
            case 'AuthorizationError':
            case 'RequestError':
            case 'ParseError':
                return 'нет доступа к `r6db.com`';
                break;
            case 'WrongNickname':
                return 'пользователь с ником `' + nick + '` в Uplay не найден!';
                break;
            case 'DiscordAPIError':
                return `вы успешно зарегистрировались, но для вашего ранга в игре роль не предусмотрена! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``
                break;
            case 'TypeError':
                return `произошла ошибка Discord! Если вы находитесь в режиме "Невидимка", то выйдите из него и попробуйте еще раз.`;
                break;
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
        let user = bot.users.get(id);
        let member = await msg.channel.guild.fetchMember(user);

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

        await member.removeRoles(roles, answ);
        return answ;
    } catch (err) {
        throw err;
    }
}

module.exports.info = async function (id) {
    try {
        let genome = await db.hgetAsync('user_' + id, 'genome');
        if (genome) {
            return 'профиль: https://r6db.com/player/' + genome;
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