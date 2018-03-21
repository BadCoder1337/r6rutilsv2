var r6db = require('./r6db');
var db = require('./db'); 

async function r6db_f() {
    try {
        let genome = await r6db.getGenome('FaZebook.ADL');
        console.log(genome);
        let rank = await r6db.getRank(genome);
        console.log(rank);
    } catch(err) {
        console.log(err.name);
        console.log(err.message);
    }
}

async function db_f() {
    try {
        let user = await db.getUser('125634283258773504');
        await db.delUser('125634283258773504');
        console.log(user);
    } catch(err) {
        console.log(err.name);
        console.log(err.message);
    }
}

//main();
 db_f();