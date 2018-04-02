var express = require('express');
var bot = require('../lib/discord');
var db = require('../lib/db');
var router = express.Router();
var callback_uri = encodeURIComponent(process.env.CALLBACK_URI);
var btoa = require('btoa');
var fetch = require('node-fetch');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { alertMessage: '' });
});

router.get('/login', async function(req, res) {
  var login_uri = `https://discordapp.com/oauth2/authorize?client_id=${bot.Client.user.id}&response_type=code&scope=guilds%20identify&redirect_uri=${callback_uri}`;
  if (req.query.nick) {
    res.cookie.firstNick = req.query.nick;
  }
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
    if (!req.query.code) throw new Error('NoCodeProvided');
    var code = req.query.code;
    var creds = btoa(`${bot.Client.user.id}:${process.env.DISCORD_SECRET}`);
    let response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${callback_uri}`, {method: 'POST', headers: {Authorization: `Basic ${creds}`}});
    var json = await response.json();
    console.log(json);
    res.cookie('token', json.access_token);
    let response2 = await fetch(`http://discordapp.com/api/users/@me`, {method: 'GET', headers: {Authorization: `Bearer ${json.access_token}`}});
    var user = await response2.json();
    await db.hsetAsync('user_'+user.id, 'token', json.access_token);
    res.redirect('/user/');
  } catch(err) {
    res.send(err);
    console.log(err);
  }
});

module.exports = router;