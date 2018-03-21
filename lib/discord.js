var Discord = require('discord.js');
var bot = new Discord.Client();

bot.on('ready', () => {
    console.log('Bot ready!');
});

bot.on('warn', warn => {
    console.log('[Warn] '+warn);
});

bot.on('error', err => {
    console.log('[Error] '+err);
});

bot.on('message', message => {
    if (!message.author.bot & message.content.startsWith('!')) {
        console.log(`Life printed ${message.content}`);
        message.channel.send('Pinging...').then(sent => {
            sent.edit(`Pong! Took ${sent.createdTimestamp - message.createdTimestamp}ms`);
        });
    } else {return}
});

bot.login(process.env.DISCORD_TOKEN).then(res => {
    module.exports.Client = bot;
}).catch(err => {console.log(err)});

