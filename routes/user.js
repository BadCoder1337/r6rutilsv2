var express = require('express');
var router = express.Router();
var fetch = require('node-fetch');
var bot = require('../lib/discord');
var db = require('../lib/db');
var r6db = require('../lib/r6db');
var cmds = require('../lib/commands');

async function getUser(token) {
  if (!token) {let e = new Error('InvalidToken');
  e.name = 'InvalidToken'; 
  throw e;};
        
    let response = await fetch(`https://discordapp.com/api/users/@me`, {method: 'GET', headers: {Authorization: `Bearer ${token}`}});
    var user = await response.json();

    if (user.code === 0) {let e = new Error('InvalidToken');
    e.name = 'InvalidToken'; 
    throw e;}

    return user;
}

async function getGuilds(token) {
  if (!token) {let e = new Error('InvalidToken');
  e.name = 'InvalidToken'; 
  throw e;};

    let response = await fetch(`https://discordapp.com/api/users/@me/guilds`, {method: 'GET', headers: {Authorization: `Bearer ${token}`}});
    var guilds = await response.json();

    if (guilds.code === 0) {let e = new Error('InvalidToken');
    e.name = 'InvalidToken'; 
    throw e;}

    return guilds;
}

router.post('/nickname', async function(req, res) {
  try {
    let user = await getUser(req.cookies.token);

    if (!req.body.nickname) {res.redirect('/user/'); return;}

    let pastGenome = await db.hgetallAsync('user_'+user.id);
    
    let genome = await r6db.getGenome(req.body.nickname);    

    if (!pastGenome.genome) {
      db.rpushAsync('cooldown', user.id);
    }

    await db.hsetAsync('user_'+user.id, 'genome', genome);

    res.redirect('/user/?m=succnick&g='+genome);

  } catch (err) {
    switch (err.name) {
      case 'RequestError':
      case 'WrongNickname':
        res.redirect('/user/?m=errnick');
        break; 
      case 'InvalidToken':
        res.redirect('/login'); 
      default:
        let code = await cmds.reportError(err, bot.Client);
        res.redirect('/user/?m=error&c='+code);
        break;
    }
  }
});

router.post('/feedback', async function(req, res) {
  try {
    let user = await getUser(req.cookies.token);

    if (!req.body.feedback) {res.redirect('/user/'); return}

    let dm = bot.Client.users.get(process.env.SUPPORT_ID);
    let msg = user.id+'\n'+user.username+'#'+user.discriminator+'\n\n'+req.body.feedback+'\n(с сайта)';
    if (msg.length <= 1900) {
      dm.send(msg);
      res.redirect('/user/?m=succsend');
    } else {
      res.redirect('/user/?m=errsend');
    }

  } catch (err) {
    switch (err.name) {
      case 'InvalidToken':
        res.redirect('/login'); 
      default:
        let code = await cmds.reportError(err, bot.Client);
        res.redirect('/user/?m=error&c='+code);
        break;
    }
  }
});

router.post('/roles', async function(req, res) {
  try {

    var user = await getUser(req.cookies.token);

    let guild = bot.Client.guilds.get(req.query.id);

    if (guild.ownerID == user.id || user.id == process.env.SUPPORT_ID) {
      await db.hmsetAsync('guild_'+guild.id, req.body);
      res.redirect('/user/?m=succguild&n='+encodeURIComponent(guild.name))
    } else {
      res.redirect('/user/?m=errguild&n='+encodeURIComponent(guild.name));
    }
        
  } catch (err) {    
    switch (err.name) {
      case 'InvalidToken':
        res.redirect('/login'); 
      default:
        let code = await cmds.reportError(err, bot.Client);
        res.redirect('/user/?m=error&c='+code);
        break;
    }
  }
});

/* GET users listing. */
router.get('/', async function(req, res, next) {
  try {
    var user = await getUser(req.cookies.token);
    var guilds = await getGuilds(req.cookies.token);
    
    let commonGuilds = bot.Client.guilds.filterArray(e => {
      let m = e.member(bot.Client.users.get(user.id));
      return !!m;
    });

    var a = bot.Client.guilds.array();

    if (commonGuilds.length == 0) {
      var servers = {names: [], links: []};    
      let widgets = [];
      for (let i = 0; i < a.length; i++) {
        let resp = await fetch(`https://discordapp.com/api/guilds/${a[i].id}/widget.json`);
        widgets.push(resp.json());
      }
      widgets = await Promise.all(widgets);    
      widgets.forEach(e => {
        if (e.instant_invite) {
          servers.names.push(e.name);
          servers.links.push(e.instant_invite);
        }
      });    
      res.render('admin', {
        title: ['Настройки'],
        section: ['invites'],
        guilds: servers,
        alertMessages: [{title: user.username+' ,вас нет ни на одном сервере', message: 'Доступные серверы перечислены ниже', type: 'danger'}]
      }); return;};

    var render = {
      title: ['Настройки', 'Изменить никнейм', 'Настроить бота', 'Написать в поддержку'],
      section: ['nick', 'feedback'],
      alertMessages: [],
      nick: ''
    }
    
    let dbUser = await db.hgetallAsync('user_'+user.id);
    if (!dbUser.genome) {
      render.alertMessages.push({title: 'Привяжите аккаунт', message: 'Вы не указали никнейм в Uplay', type: 'danger'});
    } else {
      render.nick = await r6db.getName(dbUser.genome);
    }

    var own = [];

    for (let i = 0; i < a.length; i++) {
      if (a[i].ownerID == user.id || user.id == process.env.SUPPORT_ID) {
        let settings = await db.hgetallAsync('guild_'+a[i].id);
        own.push({guild: a[i], settings: settings});
      }
    }

    if (own.length) {
      render.section.push('roles');
      render.guildSettings = own;
    }
    let m = req.query.m;
      if (typeof m == 'string') {
          if (m.includes('succreg')) {
            render.alertMessages.push({title: `<img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64"> Добро пожаловать, ${user.username.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`, message: 'Вы успешно вошли', type: 'success'});
            };
          if (m.includes('succwnick')) {
            render.alertMessages.push({title: `<img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64"> Добро пожаловать, ${user.username.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`, message: `Вы успешно зарегистрировались и привязали аккаунт <a href="https://r6db.com/player/${req.query.g}">${render.nick}</a>`, type: 'success'});
            };
          if (m.includes('succnick')) {
            render.alertMessages.push({title: 'Никнейм изменен', message: 'Вы успешно сменили привязанный аккаунт <a href="https://r6db.com/player/'+req.query.g+'">Uplay</a>', type: 'success'});
            };
          if (m.includes('succguild')) {
            render.alertMessages.push({title: 'Настройки обновлены', message: 'Вы успешно обновили настройки бота для '+decodeURIComponent(req.query.n), type: 'success'});
            };
          if (m.includes('succsend')) {
            render.alertMessages.push({title: 'Сообщение отправлено', message: 'Сообщение для поддержки отправлено. Убедитесь, что ЛС с ботом открыты', type: 'success'});
            };
          if (m.includes('errnick')) {
            render.alertMessages.push({title: 'Ошибка смены никнейма', message: 'Вы неверно указали свой никнейм в Uplay, или просто сервера недосупны ¯\\_(ツ)_/¯', type: 'danger'});
            };
          if (m.includes('errguild')) {
            render.alertMessages.push({title: 'Ошибка обновления настроек', message: 'У вас нет прав на '+decodeURIComponent(req.query.n), type: 'danger'});
            };
          if (m.includes('errsend')) {
            render.alertMessages.push({title: 'Сообщение не отправлено', message: 'Нельзя отправить более 1900 символов', type: 'danger'});
          }
          if (m.includes('error')) {
            render.alertMessages.push({title: 'Ошибка', message: 'Произошла непредвиденная ошибка, код: '+req.query.c, type: 'danger'});
            };
        }
      console.log(render.alertMessages);
    res.render('admin', render);

  } catch (err) {
    switch (err.message) {
      case 'InvalidToken':
        res.redirect('../login');
        break;
      default:
        cmds.reportError(err, bot.Client);
        res.render('error', {message: 'Error', error: err})
    }
  }
});

module.exports = router;
