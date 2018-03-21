var express = require('express');
var bot = require('../lib/discord');
var router = express.Router();
var callback_uri = encodeURIComponent('https://r6rutilsv2.herokuapp.com/auth');
var btoa = require('btoa');
var fetch = require('node-fetch');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function(req, res) {
  res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${bot.Client.user.id}&response_type=code&scope=guilds%20identify&redirect_uri=${callback_uri}`);
});

router.get('/auth', async function(req, res) {
  try {
    if (!req.query.code) throw new Error('NoCodeProvided');
    var code = req.query.code;
    var creds = btoa(`${bot.Client.user.id}:${process.env.DISCORD_SECRET}`);
    var response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${callback_uri}`, {method: 'POST', headers: {Authorization: `Basic ${creds}`}});
    var json = await response.json();
    console.log(json);
    res.redirect(`/user/?token=${json.access_token}`);
  } catch(err) {
    console.log(err);
    res.status(500);
  }
});

module.exports = router;
