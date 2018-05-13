const express = require('express');
const bot = require('../lib/discord');
const db = require('../lib/db');
const r6db = require('../lib/r6db');
const router = express.Router();
const btoa = require('btoa');
const fetch = require('node-fetch');
const crypto = require('crypto');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { alertMessage: '' });
});

router.get('/login', async function(req, res) {
  try {
    const login_uri = `https://discordapp.com/oauth2/authorize?client_id=${bot.Client.user.id}&response_type=code&scope=guilds%20identify&redirect_uri=${encodeURIComponent(process.env.CALLBACK_URI)}`;
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
    let code = req.query.code;
    let creds = btoa(`${bot.Client.user.id}:${process.env.DISCORD_SECRET}`);
    let response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(process.env.CALLBACK_URI)}`, {method: 'POST', headers: {Authorization: `Basic ${creds}`}});
    let json = await response.json();
    console.log(json);
    res.cookie('token', json.access_token, { maxAge: json.expires_in});
    let response2 = await fetch(`https://discordapp.com/api/users/@me`, {method: 'GET', headers: {Authorization: `Bearer ${json.access_token}`}});
    let user = await response2.json();
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
  let b = req.body;
  let hash = crypto.createHash('sha1').update(`${b.notification_type}&${b.operation_id}&${b.amount}&${b.currency}&${b.datetime}&${b.sender}&${b.codepro}&${process.env.YANDEX_SECRET}&${b.label}`).digest('hex');
  if (b.unaccepted == 'false' && hash == b.sha1_hash && b.amount > 90) {
    db.hsetAsync('guild_'+b.label, 'payed', 1);
  }
  res.status(200);
})

module.exports = router;