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
        let dm = bot.users.get(process.env.SUPPORT_ID);
        let code = Math.random().toString(36).substring(2, 6);
        if (msg) {
            msg.reply('произошла ошибка! Код: `'+code+'` (данные для поддержки)');
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
        await db.hmsetAsync('guild_'+guild.id, ['Diamond', '', 'Platinum', '', 'Gold', '', 'Silver', '', 'Bronze', '', 'Copper', '', 'Unranked', '', 'diamondStab', 1]);
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

module.exports.banGenome = async function (guild, user) {
    console.log('[Bot] Banning by Uplay genome');
    try {
        let genome = await db.hgetAsync('user_'+user.id, 'genome');
        db.zaddAsync('guild_'+guild.id+'_banlist', 0, genome);
    } catch (err) {
        throw err;
    }
}

module.exports.unbanGenome = async function (guild, id) {
    console.log('[Bot] Unbanning by Uplay genome');
    try {
        let genome = await db.hgetAsync('user_'+id, 'genome');
        if (!genome) {
            return 'пользователь не найден!';
        }
        //console.log(genome);
        db.zremAsync(`guild_${guild.id}_banlist`, genome);
        return 'пользователь разбанен!';

    } catch (err) {
        throw err;
    }
}

module.exports.update = async function (bot, guilds, id) {
    try {
        console.log(`[Rank] Updating ${bot.users.get(id).tag}`);
        let genome = await db.hgetAsync('user_'+id, 'genome');

        var rank = await r6db.getRank(genome);
        let dm = bot.users.get(id);
        guilds.forEach(async (e) => {
            try {

                if (await db.zrankAsync('guild_'+e.id+'_banlist', genome) != null) {
                    e.owner.send(`Аккаунт Uplay https://r6db.com/player/${genome} пользователя <@${id}> находится в черном списке сервера ${e.name}.`);
                }

                var rolesDB = await db.hgetallAsync('guild_'+e.id);    
                var member = e.member(bot.users.get(id)); 
                if (!(rolesDB.diamondStab == '1' & !!member.roles.get(rolesDB.Diamond)) || rank == 0 ) {
                    
                    var guildRoles = e.roles;
                    
                    var roles = [];
                    Object.keys(rolesDB).forEach(e => {
                        let r = guildRoles.get(rolesDB[e]);
                        roles.push(r);
                    });
                    var r = guildRoles.get(rolesDB[ranks[rank].split(' ')[0]]);
                    if (member.roles.array().includes(r)) {return};
                    await member.removeRoles(roles, 'Удаляю роли перед обновлением...');
                    if (r) {
                        await member.addRole(r , '...готово!');
                    }
                }

            } catch (err) {
                if (!err.message == 'Unknown Role') {
                throw err;}
            }
        });
    } catch (err) {
        throw err;
    }
}

module.exports.rank = async function (bot, msg, nick) {
    try {
        console.log(`[Rank] Registering ${msg.author.tag}, nick ${nick}`);
        var guildRoles = msg.channel.guild.roles;
        var member = msg.member;
        var exist = await db.hgetAsync('user_'+member.id, 'genome');
        //console.log('exist: ', exist);
        if (!exist & !!nick) {
            if (nick.length > 15 || nick.length < 3 || /[^\w-\.]/g.test(nick)) {
                return 'укажите корректный ник Uplay!';
            }
            var genome = await r6db.getGenome(nick);
            var rank = await r6db.getRank(genome);
            
            if (await db.zrankAsync('guild_'+msg.channel.guild.id+'_banlist', genome) != null) {
                msg.channel.guild.owner.send(`Аккаунт Uplay https://r6db.com/player/${genome} пользователя <@${member.id}> находится в черном списке сервера ${msg.channel.guild.name}.`);
            }

            await db.hsetAsync('user_'+member.id, 'genome', genome);
            await db.lpushAsync('cooldown', member.id);

            var rolesDB = await db.hgetallAsync('guild_'+msg.guild.id);
            
            
            var r = guildRoles.get(rolesDB[ranks[rank].split(' ')[0]]);
            if (r) {
                await member.addRole(r, 'пользователь зарегистрирован');
                var answ = `вы успешно зарегистрировались! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``;
            } else {
                var answ = `вы успешно зарегистрировались, но для вашего ранга в игре роль не предусмотрена! Ник: \`${nick}\`, ранг \`${ranks[rank]}\``
            }
        } else if (exist) {
            let llen = await db.llenAsync('cooldown');
            var answ = 'ручное обновление больше не нужно! Теперь бот обновляет ранг автоматически с периодом '+strTime(llen*(process.env.COOLDOWN/1000))+' ('+llen+' польз.)';
        } else if (!nick) {
            var answ = 'укажите ник в Uplay!';
        }
        return answ;
    } catch(err) {
        switch (err.name) {
            case 'AuthorizationError':
                return 'нет доступа к `r6db.com`';
                break;
            case 'WrongNickname': 
                return 'пользователь с ником `'+nick+'` в Uplay не найден!';
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
        return answ;
    } catch (err) {
        throw err;
    }
}

module.exports.unregister = async function (bot, msg, id) {
    try {
        var guildRoles = msg.channel.guild.roles;
        //console.log(guildRoles);
        let user = bot.users.get(id);
        let member = await msg.channel.guild.fetchMember(user);
        //console.log(user);
        //console.log(member);

        if (!await db.existsAsync('user_'+id)) {
            let answ = 'пользователь не зарегистрирован!';
            return answ;
        }
        
        deleteUser(id);

        var roles = [];
        var rolesDB = await db.hgetallAsync('guild_'+msg.guild.id);
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
        let genome = await db.hgetAsync('user_'+id, 'genome');
        if (genome) {
            return 'профиль: https://r6db.com/player/'+genome;
        } else {
            return 'пользователь не зарегистрирован!'
        }
    } catch (err) {
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