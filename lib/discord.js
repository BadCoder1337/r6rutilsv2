var Discord = require('discord.js');
var bot = new Discord.Client();
var prefix = process.env.PREFIX;
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
        await cmds.addGuild(guild);
    } catch (err) {
        cmds.reportError(err, bot);   
    }
});

bot.on('guildDelete', async (guild) => {
    try {
        await cmds.removeGuild(guild);
    } catch (err) {
        cmds.reportError(err, bot);
    }
});

bot.on('message', async (message) => {
    try {
        
        if (!message.author.bot & message.content.startsWith(prefix) & message.channel.type == 'text' & !waitingList.includes(message.author.id)) {
            console.log(`[${message.guild.name}, ${message.channel.name}] ${message.content}`);
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
                case prefix+'unreg':
                    if (user.permissions.has('MANAGE_ROLES')) {
                        message.reply(await cmds.unregister(bot, message, command[1].replace(/\D/g, '')));
                    } else {
                        message.reply('эта команда доступна **только** администрации!');
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
}).catch(err => {console.log(err)});

