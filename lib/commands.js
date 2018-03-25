var r6db = require('./r6db');
var db = require('./db'); 
//var { parser, htmlOutput, toHTML } = require('discord-markdown');
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));

function strTime(timeDiff) {
    let diffDays = Math.ceil(timeDiff / 86400)-1;
    let diffHours = Math.ceil((timeDiff % 86400) / 3600)-1;
    let diffMinutes = Math.ceil((timeDiff % 3600) / 60)-1;
    return '**'+diffHours+' ч. '+diffMinutes+' м.**';
}

module.exports.rank = async function (id, nick) {
    try {
        if (!await db.existsAsync('user_'+id)) {
            let genome = await r6db.getGenome(nick);
            let rank = await r6db.getRank(genome);
            
            await db.hsetAsync('user_'+id, 'genome', genome);
            await db.lpushAsync('cooldown', id);

            var answ = `вы зарегистрировались и были поставлены в начало очереди на обновление. Ник: ${nick}, ранг ${rank}`
        } else {
            var answ = 'ручное обновление больше не нужно! Теперь бот обновляет ранг автоматически с периодом '+strTime((await db.dbsizeAsync()-2)*60);
        }
        return answ;
    } catch(err) {
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