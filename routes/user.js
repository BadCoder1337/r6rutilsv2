var express = require('express');
var router = express.Router();
var fetch = require('node-fetch');
var bot = require('../lib/discord');
var db = require('../lib/db');
var r6db = require('../lib/r6db');

/* GET users listing. */
router.get('/', async function(req, res, next) {
  try {
    if (!req.cookies.token) {throw new Error('InvalidToken')};
        
    let response = await fetch(`http://discordapp.com/api/users/@me`, {method: 'GET', headers: {Authorization: `Bearer ${req.cookies.token}`}});
    var user = await response.json();
    let response2 = await fetch(`http://discordapp.com/api/users/@me/guilds`, {method: 'GET', headers: {Authorization: `Bearer ${req.cookies.token}`}});
    var guilds = await response2.json();
    if (user.code === 0 || guilds.code === 0) {throw new Error('InvalidToken');}
    let commonGuilds = bot.Client.guilds.filterArray(e => {
      let m = e.member(bot.Client.users.find('id', user.id));
      return !!m;
    });
    if (commonGuilds.length == 0) {throw new Error('NoCommonGuilds')};
    let dbUser = await db.hgetallAsync('user_'+user.id);
    if (!dbUser.genome) {
      res.send('Вы не ввели ник в Uplay');
    } else {
      let nick = await r6db.getName(dbUser.genome);
      res.send(commonGuilds+'\n'+nick);
    }
  } catch (err) {
    //res.send(err);
    //console.log('ERROR '+err.stack);
    switch (err.message) {
      case 'InvalidToken':
        res.redirect('../login');
        break;
      case 'NoCommonGuilds':
        res.redirect('../');
      default:
        res.send(err)
    }
    //res.send(err);
  }
  //res.send('respond with a resource');
});

module.exports = router;
