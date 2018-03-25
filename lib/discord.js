var Discord = require('discord.js');
var bot = new Discord.Client();
var prefix = process.env.PREFIX;
var cmds = require('./commands');

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

bot.on('message', async (message) => {
    if (!message.author.bot & message.content.startsWith(prefix) & message.channel.type == 'text') {
        // console.log(`Life printed ${message.content}`);
        // message.channel.send('Pinging...').then(sent => {
        //     sent.edit(`Pong! Took ${sent.createdTimestamp - message.createdTimestamp}ms`);
        // });
        var msg = message.content.replace(/ +(?= )/g,''); //убираем множественные пробелы
        var user = message.member;
        var command = msg.split(' ');
        switch(command[0]) {
            case prefix+'rank':
            message.reply(await cmds.rank(user.id, command[1]));
            break;
            default: 
            user.send(await cmds.help());
        }

    } else {return}
});

bot.login(process.env.DISCORD_TOKEN).then(res => {
    module.exports.Client = bot;
}).catch(err => {console.log(err)});

