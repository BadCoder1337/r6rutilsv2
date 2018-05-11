var express = require('express');
var bot = require('../lib/discord');
var db = require('../lib/db');
var r6db = require('../lib/r6db');
var router = express.Router();
var callback_uri = encodeURIComponent(process.env.CALLBACK_URI);
var btoa = require('btoa');
var fetch = require('node-fetch');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { alertMessage: '' });
});

// router.get('/test', async function(req, res) {

//   var servers = {names: [], links: []};

//   let widgets = [];
//   var a = bot.Client.guilds.array();
//   for (let i = 0; i < a.length; i++) {
//     let resp = await fetch(`https://discordapp.com/api/guilds/${a[i].id}/widget.json`);
//     widgets.push(resp.json());
//   }
//   widgets = await Promise.all(widgets);

//   widgets.forEach(e => {
//     if (e.instant_invite) {
//       servers.names.push(e.name);
//       servers.links.push(e.instant_invite);
//       console.log(servers);
//     }
//   });

//   res.render('admin', {
//     title: ['Настройки'],
//     section: ['invites'],
//     guilds: servers,
//     alertMessage: {title: 'Вас нет ни на одном сервере', message: 'Доступные серверы перечислены ниже', type: 'danger'}
//   });
// });

router.get('/login', async function(req, res) {
  var login_uri = `https://discordapp.com/oauth2/authorize?client_id=${bot.Client.user.id}&response_type=code&scope=guilds%20identify&redirect_uri=${callback_uri}`;
  try {
    let response = await fetch(`http://discordapp.com/api/users/@me`, {method: 'GET', headers: {Authorization: `Bearer ${req.cookies.token}`}});
    let user = await response.json();
    if (user.code === 0) {
      throw new Error();
    }
    res.redirect('/user/');
  } catch (err) {
    res.redirect(login_uri);
  }
});

router.get('/auth', async function(req, res) {
  try {
    if (!req.query.code) {res.redirect('/')};
    var code = req.query.code;
    var creds = btoa(`${bot.Client.user.id}:${process.env.DISCORD_SECRET}`);
    let response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${callback_uri}`, {method: 'POST', headers: {Authorization: `Basic ${creds}`}});
    var json = await response.json();
    console.log(json);
    res.cookie('token', json.access_token, { maxAge: json.expires_in});
    let response2 = await fetch(`https://discordapp.com/api/users/@me`, {method: 'GET', headers: {Authorization: `Bearer ${json.access_token}`}});
    var user = await response2.json();
    await db.hsetAsync('user_'+user.id, 'token', json.access_token);
    let pastGenome = await db.hgetallAsync('user_'+user.id);
    if (req.cookies.firstNick && !pastGenome.genome) {
      let genome = await r6db.getGenome(req.cookies.firstNick);
      await db.hsetAsync('user_'+user.id, 'genome', genome);
      db.rpushAsync('cooldown', user.id);
      res.redirect('/user/?m=succwnick&g='+genome);
      return;
    }
    res.redirect('/user/?m=succreg');
  } catch(err) {
    res.send(err);
    console.log(err.message);
    console.log(err.stack);
  }
});

router.post('/payment', async function(req, res) {
  console.log(req.query);
  console.log(req);
  res.status(200)  
})

module.exports = router;