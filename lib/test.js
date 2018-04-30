var r6db = require('./r6db');
var db = require('./db'); 
//var bot = require('./discord');
//var cmd = require('./commands');

var fetch = require('node-fetch');

Array.prototype.forEachAsync = function(fn, scope) {
    return new Promise((resolve, reject) => {
        for (let i = 0, len = this.length; i < len; i++) {
            fn.call(scope, this[i], i, this);            
        }
        resolve();
    })
  };

async function test() {
    let a = ['a', 'b', 'c'];
    var answs = [];
    a.forEachAsync(async (e) => {
        console.log(e);
        let answ = await fetch('https://google.com');
        //console.log(answ);
    });
    console.log('Done');
}

async function r6db_f() {
    try {
        let genome = await r6db.getGenome('FaZebook.ADL');
        console.log(genome);
        let rank = await r6db.getRank(genome);
        console.log(rank);
        let name = await r6db.getName(genome);
        console.log(name);
    } catch(err) {
        console.log('ERROR! '+err.name);
        console.log('ERROR! '+err.message);
    }
}

async function db_f() {
    try {
        let genome = await db.hgetAsync('user_235459488067485698', 'genome');
        console.log(genome);
        //let user = await db.getUser('125634283258773504');
        //await db.delUser('125634283258773504');
        //console.log(user);
    } catch(err) {
        console.log('ERROR!'+err.name);
        console.log('ERROR!'+err.message);
    }
}

async function main() {
    console.log(await cmd.help());
    console.log(await cmd.rank('125634283258773504','FaZebook.ADL'));
}

//main();
test();
//r6db_f();
//r6db_f();
 //db.setUser('125634283258773504', {ubisoft_id: "c09fc7c9-5d45-4c6c-94e5-2dee159abff3", last_update: 1521897837505})
//  db.delUser('125634283258773504')
//     .then(res => {
//         console.log(res);
//     })
//     .catch(err => {
//         console.log(err);
//     });
// setInterval(async function() {
//     await db.cdRotaionPush(await db.cdRotaionPop());
// }, 10000);