require('dotenv').config();

var Discord = require('discord.js');
var bot = new Discord.Client();
var prefix = process.env.PREFIX;
console.log('prefix: ', prefix);
var cmds = require('./commands');

var waitingList = [];

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

var timer = setInterval(async function () {
    try {
        let userId = await cmds.rotateUsers();
        let commonGuilds = bot.guilds.filterArray(e => {
            let m = e.member(bot.users.get(userId));
            return !!m;
          });
        if (!commonGuilds.length) {cmds.deleteUser(userId); return;}
        await cmds.update(bot, commonGuilds, userId);
    } catch (err) {
        cmds.reportError(err, bot);
    }
}, process.env.COOLDOWN || 60000);
bot.on('ready', () => {
    console.log('[Bot started]');
    bot.user.setPresence({
      status: 'online',
      game: {
        name: 'r6rutilsv2.herokuapp.com',
        type: 'STREAMING'
      }
    });
  });

bot.on('warn', warn => {
    console.log('[Warn] '+warn);
});

bot.on('error', err => {
    console.log('[Error] '+err);
});

bot.on('guildCreate', async (guild) => {
    try {
        cmds.addGuild(guild);
    } catch (err) {
        cmds.reportError(err, bot);   
    }
});

bot.on('guildDelete', async (guild) => {
    try {
        cmds.removeGuild(guild);
    } catch (err) {
        cmds.reportError(err, bot);
    }
});

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
        if (message.author.bot) {return}
        
        if ((message.channel.type == 'dm' || message.channel.type == 'group') && message.author.id == process.env.SUPPORT_ID) {
            let dm = bot.users.get(message.content.slice(0, 18));
            if (dm) {dm.send('Ответ от поддержки ('+message.author.tag+'):\n\n'+message.content.slice(19)).then(msg => {
              message.react('🆗');
            });}
            return;
          } else if (message.channel.type == 'dm' || message.channel.type == 'group') {
            if (message.content.startsWith(prefix+'support')) {
              let dm = bot.users.get(process.env.SUPPORT_ID);
              if (dm) {dm.send(message.author.id+'\n'+message.author.tag+'\n\n'+message.content.slice(9)).then(msg => {
                message.react('🆗');
              });}
            } else {message.channel.send(await cmds.help());}
            return;
          }
        
        if (message.content.startsWith(prefix) & message.channel.type == 'text' & !waitingList.includes(message.author.id)) {
            console.log(`[${message.guild.name}, #${message.channel.name} @${message.author.tag}] ${message.content}`);
            var msg = message.content.replace(/ +(?= )/g, ''); //убираем множественные пробелы
            var user = message.member;
            var command = msg.split(' ');
            var guildRoles = message.channel.guild.roles;
            waitingList.push(user.id);
            switch(command[0]) {
                case prefix+'rank':
                    message.reply(await cmds.rank(bot, message, command[1]));
                    break;
                case prefix+'crashtest':
                    if (message.author.id == process.env.SUPPORT_ID) {
                        throw new Error('Test'+command[1]);
                    }
                    break;
                case prefix+'reg':
                    if (user.permissions.has('MANAGE_ROLES') || message.author.id == process.env.SUPPORT_ID) {
                        message.reply(await cmds.register(command[1].replace(/\D/g, ''), command[2]))
                    }
                    break;
                case prefix+'unreg':
                    if (user.permissions.has('MANAGE_ROLES') || message.author.id == process.env.SUPPORT_ID) {
                        message.reply(await cmds.unregister(bot, message, command[1].replace(/\D/g, '')));
                    } else {
                        message.reply('эта команда доступна **только** администрации!');
                    }
                    break;
                case prefix+'unban':
                    if (user.permissions.has('MANAGE_ROLES') || message.author.id == process.env.SUPPORT_ID) {
                        message.reply(await cmds.unbanGenome(message.channel.guild, command[1].replace(/\D/g, '')));
                    } else {
                        message.reply('эта команда вам недоступна!');
                    }
                    break;
                case prefix+'ping':
                    let sent = await message.channel.send('Пингуем...');
                    sent.edit(`Понг! Задержка ${sent.createdTimestamp - message.createdTimestamp}мс`);
                    break;
                case prefix+'info':
                    if (command[1]) {
                        message.reply(await cmds.info(command[1].replace(/\D/g, '')));
                    } else {
                        message.reply('упомяните пользователя, чтобы узнать ник!');
                    }
                    break;
                default: 
                    user.send(await cmds.help());
            }
            waitingList.remove(user.id);
        } else {return}

    } catch (err) {
        cmds.reportError(err, bot, message);
    }
});

bot.login(process.env.DISCORD_TOKEN).then(res => {
    
    module.exports.Client = bot;
}).catch(err => {throw err});

