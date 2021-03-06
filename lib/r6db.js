const r6api = require('r6api')({
  email: process.env.R6API_LOGIN,
  password: process.env.R6API_PASSWORD
}, {logLevel: process.env.R6API_LOGLEVEL});

module.exports.getGenome = async function (nick) {
  try {
    let response = await r6api.findByName(nick);
    return response[0].id;
  } catch (err) {
    if (err.name == 'TypeError') {
      let e = new Error('WrongNickname');
      e.name = 'WrongNickname';
      throw e;
    } else {
      throw err;
    }
  }
};

module.exports.getRank = async function (genome) {
  try {
    let response = await r6api.getRanks(genome);
    //console.log(response);
    return response[0].emea.rank;
  } catch (err) {
    throw err;
  }
};

module.exports.getStats = r6api.getStats;
module.exports.getRanks = r6api.getRanks;

// module.exports.getRanks = async function() {
//   let a = [];
//   for (let i = 0; i < arguments.length; i++) {
//     a = a.concat(arguments[i]);
//   }
//   try {
//     let response = await r6api.getRanks(...a);
//     let answ = [];
//     response.forEach(e => {
//       answ.unshift(e.emea.rank);
//     });
//     return answ;
//   } catch (err) {
//     throw err;
//   }
// }

module.exports.getName = async function (genome) {
  try {
    let response = await r6api.getCurrentName(genome);
    //console.log(response);
    return response[0].name;
  } catch (err) {
    throw err;
  }
}