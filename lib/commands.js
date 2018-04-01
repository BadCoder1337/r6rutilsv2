var r6db = require('./r6db');
var db = require('./db'); 
//var { parser, htmlOutput, toHTML } = require('discord-markdown');
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));
var ranks = [
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

function strTime(timeDiff) {
    let diffDays = Math.ceil(timeDiff / 86400)-1;
    let diffHours = Math.ceil((timeDiff % 86400) / 3600)-1;
    let diffMinutes = Math.ceil((timeDiff % 3600) / 60)-1;
    return '**'+diffHours+' ч. '+diffMinutes+' м.**';
}

async function deleteUser(id) {
    await db.delAsync('user_'+id);
    await db.lremAsync('cooldown', 0, id);
}

module.exports.deleteUser = deleteUser;

module.exports.reportError = async function (err, bot, msg) {
    try {
        let dm = bot.users.find('id', process.env.SUPPORT_ID);
        let code = Math.random().toString(36).substring(2, 6);
        if (msg) {
            msg.reply('произошла ошибка! Код: `'+code+'` (данные для поддержки)');
            dm.send(`[${msg.guild.name}, <#${msg.channel.id}>, <@${msg.author.id}>] ${msg.content}\n\`${code}\`: \`${err.name}\` \`\`\`JavaScript\n${err.stack}\`\`\` `)
        } else {
            dm.send(` \`${code}\`: \`${err.name}\` \`\`\`JavaScript\n${err.stack}\`\`\` `);
        }
    } catch (err) {
        console.log('-----UNSEND ERROR-----')
        console.log(err);
    }    
}

module.exports.rotateUsers = async function () {
    try {
        let user = await db.rpoplpushAsync('cooldown', 'cooldown');
        return user;
    } catch (err) {
        throw err;
    }        
}

module.exports.addGuild = async function (guild) {
    console.log('[Bot] Joining '+guild.name);
    try {
        await db.hmsetAsync('guild_'+guild.id, ['Diamond', '', 'Platinum', '', 'Gold', '', 'Silver', '', 'Bronze', '', 'Copper', '', 'Unranked', '', 'diamondStab', true]);
    } catch (err) {
        throw err;
    }
}

module.exports.removeGuild = async function (guild) {
    console.log('[Bot] Leaving '+guild.name);
    try {
        await db.delAsync('guild_'+guild.id);
    } catch (err) {
        throw err;
    }
}

module.exports.update = async function (bot, guilds, id) {
    try {
        let genome = await db.hgetAsync('user_'+id, 'genome');
        var rank = await r6db.getRank(genome);
        let dm = bot.users.find('id', id);
        guilds.forEach(async (e) => {
            try {
                var rolesDB = await db.hgetallAsync('guild_'+e.id);
                var guildRoles = e.roles;
                var roles = [];
                let member = e.member(bot.users.find('id', id));
                Object.keys(rolesDB).forEach(e => {
                    let r = guildRoles.find('id', rolesDB[e]);
                    roles.push(r);
                }); 
                await member.removeRoles(roles, 'Удаляю роли перед обновлением...');
                var r = guildRoles.find('id', rolesDB[ranks[rank].split(' ')[0]]);
                if (r) {
                    await member.addRole(r , '...готово!');
                }
            } catch (err) {
                throw err;
            }
        });
        dm.send(`Привет! Я обновил твое звание на ${guilds}`);
    } catch (err) {
        throw err;
    }
}

module.exports.rank = async function (bot, msg, nick) {
    try {
        var guildRoles = msg.channel.guild.roles;
        var member = msg.member;
        var exist = await db.existsAsync('user_'+member.id);
        if (!exist & !!nick) {
            var genome = await r6db.getGenome(nick);
            let rank = await r6db.getRank(genome);
            
            await db.hsetAsync('user_'+member.id, 'genome', genome);
            await db.lpushAsync('cooldown', member.id);

            var rolesDB = await db.hgetallAsync('guild_'+msg.guild.id);
            
            // var roles = [];
            // Object.keys(rolesDB).forEach(e => {
            //     let r = guildRoles.find('id', rolesDB[e]);
            //     roles.push(r);
            // });

            var r = guildRoles.find('id', rolesDB[ranks[rank].split(' ')[0]]);
            if (r) {
                await member.addRole(r, 'пользователь зарегистрирован');
                var answ = `вы успешно зарегистрировались! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``;
            } else {
                var answ = `вы успешно зарегистрировались, но для вашего ранга в игре роль не предусмотрена! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``
            }
        } else if (exist) {
            var answ = 'ручное обновление больше не нужно! Теперь бот обновляет ранг автоматически с периодом '+strTime((await db.dbsizeAsync()-2)*60);
        } else if (!nick) {
            var answ = 'укажите ник!';
        }
        return answ;
    } catch(err) {
        switch (err.name) {
            case 'AuthorizationError':
                return 'нет доступа к `r6db.com`';
                break;
            case 'WrongNickname': 
                return 'пользователь с ником `'+nick+'` не найден!';
                break;
            default:
                throw err;
        }
    }
}

module.exports.register = async function (id, nick) {
    try {
        var exist = await db.existsAsync('user_'+id);
        if (!exist & !!nick) {
            let genome = await r6db.getGenome(nick);
            let rank = await r6db.getRank(genome);
            await db.hsetAsync('user_'+id, 'genome', genome);
            await db.rpushAsync('cooldown', id);
            var answ = `пользователь <@${id}> зарегистрирован под ником ${nick}`;
        } else if (exist) {
            var answ = 'пользователь уже зарегистрирован!';
        } else if (!nick) {
            var answ = 'укажите ник!';
        }
    } catch (err) {
        throw err;
    }
}

module.exports.unregister = async function (bot, msg, id) {
    try {
        var guildRoles = msg.channel.guild.roles;
        //console.log(guildRoles);
        let user = bot.users.find('id', id);
        let member = await msg.channel.guild.fetchMember(user);
        //console.log(user);
        //console.log(member);

        if (!await db.existsAsync('user_'+id)) {
            let answ = 'пользователь не зарегистрирован!';
            return answ;
        }
        
        deleteUser(id)

        var roles = [];
        var rolesDB = await db.hgetallAsync('guild_'+msg.guild.id);
        Object.keys(rolesDB).forEach(e => {
            let r = guildRoles.find('id', rolesDB[e]);
            roles.push(r);
        }) 
        
        // console.log(rolesDB);
        // console.log(roles);
        let answ = `пользователь ${user.tag} удален`;
        await member.removeRoles(roles, answ);
        return answ;
    } catch (err) {
        throw err;        
    }    
}

module.exports.info = async function (id) {
    try {
        let genome = await db.hgetAsync('user_'+id, 'genome');
        if (genome) {
            return 'профиль: https://r6db.com/player/'+genome;
        } else {
            return 'пользователь не зарегистрирован!'
        }
    } catch (err) {
        console.log(err);
        throw err;
    }
}

module.exports.help = async function () {
    try {
        let answ = await fs.readFileAsync('./lib/text/help.txt', 'utf8');
        return answ;
    } catch(err) {
        throw err;
    }
}