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

module.exports.rank = async function (id, nick) {
    try {
        if (!await db.existsAsync('user_'+id)) {
            let genome = await r6db.getGenome(nick);
            let rank = await r6db.getRank(genome);
            
            await db.hsetAsync('user_'+id, 'genome', genome);
            await db.lpushAsync('cooldown', id);

            var answ = `вы зарегистрировались и были поставлены в начало очереди на обновление. Ник: ${nick}, ранг ${ranks[rank]}`
        } else {
            var answ = 'ручное обновление больше не нужно! Теперь бот обновляет ранг автоматически с периодом '+strTime((await db.dbsizeAsync()-2)*60);
        }
        return answ;
    } catch(err) {
        throw err;
    }
}

module.exports.unregister = async function (id) {
    try {
        await db.delAsync('user_'+id);
        await db.lremAsync('cooldown', 0, id);

        let roles = await db.hgetallAsync('guild');
        return roles;
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