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
    } else {return}
});

bot.login(process.env.DISCORD_TOKEN).then(res => {
    module.exports.Client = bot;
    module.exports.Discord = Discord;
})

