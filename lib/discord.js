require('dotenv').config();

const Discord = require('discord.js');
const bot = new Discord.Client();
const prefix = process.env.PREFIX;
console.log('prefix: ', prefix);
const cmds = require('./commands');

let waitingList = [];

Array.prototype.remove = function () {
    let what, a = arguments,
        L = a.length,
        ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

async function interval() {
    try {
        let pack = await cmds.formPack();
        let ranks = await cmds.getRanks(...pack.genomes);
        ranks.forEach(async (e) => {
            let id = pack.ids[pack.genomes.indexOf(e.id)];
            
            let commonGuilds = bot.guilds.filterArray(elem => {
                let m = elem.member(bot.users.get(id));
                return !!m;
            });
            if (!commonGuilds.length) {
                //cmds.deleteUser(id);
                return;
            }
            await cmds.update(bot, commonGuilds, id, e.id, e.emea.rank);
        
        });
    } catch (err) {
        if (err.name != 'RequestError' && err.name != 'ParseError') {
            cmds.reportError(err, bot);
        }
    }
}

let timer = setInterval(interval, process.env.COOLDOWN || 60000);

bot.on('ready', () => {
    console.log('[Bot started]');
    bot.user.setPresence({
        status: 'online',
        game: {
            name: 'r6rutils.herokuapp.com',
            type: 'WATCHING'
        }
    });
});

bot.on('warn', warn => {
    console.log('[Warn] ' + warn);
});

bot.on('error', err => {
    console.log('[Error] ' + err);
});

bot.on('guildCreate', async (guild) => {
    try {
        cmds.addGuild(guild);
        bot.users.get(process.env.SUPPORT_ID).send(`Присоединение к ${guild.name}`);
    } catch (err) {
        cmds.reportError(err, bot);
    }
});

bot.on('guildDelete', async (guild) => {
    try {
        //cmds.removeGuild(guild);
        bot.users.get(process.env.SUPPORT_ID).send(`Отключение от ${guild.name}`);
    } catch (err) {
        cmds.reportError(err, bot);
    }
});

bot.on('guildMemberAdd', async (user) => {
    try {
        let answ = await cmds.info(user.id);
        if (answ.split(' ')[0] != 'пользователь') {
            let genome = answ.split('/')[6];
            let rank = await cmds.getRanks(genome);
            //console.log(rank);
            await cmds.update(bot, [user.guild], user.id, genome, rank[0].emea.rank)
        } //сукпздц
        
    } catch (err) {
        cmds.reportError(err, bot);
    }
})

bot.on('guildBanAdd', async (guild, user) => {
    try {
        console.log(`[Bot] ${user.tag} banned at ${guild.name}`);
        cmds.banGenome(guild, user);
    } catch (err) {
        cmds.reportError(err, bot);
    }
});

bot.on('guildBanRemove', async (guild, user) => {
    try {
        cmds.unbanGenome(guild, user.id);
    } catch (err) {
        cmds.reportError(err, bot);
    }
});

bot.on('message', async (message) => {
    try {
        if (message.author.bot) {
            return
        }

        if ((message.channel.type == 'dm' || message.channel.type == 'group') && message.author.id == process.env.SUPPORT_ID) {
            let dm = bot.users.get(message.content.slice(0, 18));
            if (dm) {
                dm.send('Ответ от поддержки (' + message.author.tag + '):\n\n' + message.content.slice(19)).then(msg => {
                    message.react('🆗');
                });
            }
            return;
        } else if (message.channel.type == 'dm' || message.channel.type == 'group') {
            if (message.content.startsWith(prefix + 'support')) {
                let dm = bot.users.get(process.env.SUPPORT_ID);
                if (dm) {
                    dm.send(message.author.id + '\n' + message.author.tag + '\n\n' + message.content.slice(9)).then(msg => {
                        message.react('🆗');
                    });
                }
            } else {
                message.channel.send(await cmds.help());
            }
            return;
        }

        if (message.content.startsWith(prefix) & message.channel.type == 'text' & !waitingList.includes(message.author.id)) {
            if (await cmds.checkPayment(message.guild.id) != '1') {
                message.reply('бот на *'+message.guild.name+'* не активирован');
                //message.guild.owner.send('Разово приобретите обслуживание бота на *'+message.guild.name+'*: https://r6rutils.herokuapp.com/user');
                return;
            }
            console.log(`[${message.guild.name}, #${message.channel.name} @${message.author.tag}] ${message.content}`);
            let msg = message.content.replace(/ +(?= )/g, '');
            let user = message.member;
            let command = msg.split(' ');
            let guildRoles = message.channel.guild.roles;
            waitingList.push(message.author.id);
            switch (command[0].toLowerCase()) {
                case prefix + 'rank':
                    message.reply(await cmds.rank(bot, message, command[1]));
                    break;
                case prefix + 'crashtest':
                    if (message.author.id == process.env.SUPPORT_ID) {
                        throw new Error('Test' + command[1]);
                    }
                    break;
                case prefix + 'reg':
                    if (user.permissions.has('MANAGE_ROLES') || message.author.id == process.env.SUPPORT_ID) {
                        if (!command[1]) {
                            message.reply('вы не упомянули пользователя!');
                        } else {
                            message.reply(await cmds.register(command[1].replace(/\D/g, ''), command[2]));
                        }
                    }
                    break;
                case prefix + 'unreg':
                    if (user.permissions.has('MANAGE_ROLES') || message.author.id == process.env.SUPPORT_ID) {
                        if (!command[1]) {
                            message.reply('вы не упомянули пользователя!');
                        } else {
                            message.reply(await cmds.unregister(bot, message, command[1].replace(/\D/g, '')));
                        }
                    } else {
                        message.reply('эта команда доступна **только** администрации!');
                    }
                    break;
                case prefix + 'unban':
                    if (user.permissions.has('MANAGE_ROLES') || message.author.id == process.env.SUPPORT_ID) {
                        if (!command[1]) {
                            message.reply('вы не упомянули пользователя!');
                        } else {
                            message.reply(await cmds.unbanGenome(message.channel.guild, command[1].replace(/\D/g, '')));
                        }
                    } else {
                        message.reply('эта команда доступна **только** администрации!');
                    }
                    break;
                case prefix + 'ping':
                    let sent = await message.channel.send('Пингуем...');
                    sent.edit(`Понг! Задержка ${sent.createdTimestamp - message.createdTimestamp}мс`);
                    break;
                case prefix + 'info':
                    if (command[1]) {
                        message.reply(await cmds.info(command[1].replace(/\D/g, '')));
                    } else {
                        message.reply(await cmds.info(message.author.id) + ' (вы)');
                    }
                    break;
                case prefix + 'update':
                    if (message.author.id == process.env.SUPPORT_ID) {
                        interval();
                    } else {
                        message.reply('эта команда доступна **только** создателю бота!');
                    }
                    break;
                case prefix + 'cooldown':
                    if (message.author.id == process.env.SUPPORT_ID) {
                        clearInterval(timer);
                        timer = setInterval(interval, command[1]*1000 || process.env.COOLDOWN);
                        message.reply('кулдаун изменен!');
                    } else {
                        message.reply('эта команда доступна **только** создателю бота!');
                    }
                    break;
                case prefix + 'invite':
                    message.reply(`https://discordapp.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=470281409&scope=bot`);
                    break;
                case prefix + 'stats':
                    message.reply(await cmds.stats(message.channel.guild));
                    break;
                default:
                    user.send(await cmds.help());
            }
            waitingList.remove(message.author.id);
        } else {
            return
        }

    } catch (err) {
        cmds.reportError(err, bot, message);
        waitingList.remove(message.author.id);
    }
});

bot.login(process.env.DISCORD_TOKEN).then(res => {

    module.exports.Client = bot;
}).catch(err => {
    throw err
});