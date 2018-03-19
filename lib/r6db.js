const r6api = require('r6api')({
  email: process.env.R6API_EMAIL,
  password: process.env.R6API_PASSWORD
});

module.exports.getGenome = async function (nick) {
  try {
    let response = await r6api.findByName(nick);
    return response[0].id;
  } catch (err) {
    throw err;
  }
};

module.exports.getRank = async function (genome) {
  try {
    let response = await r6api.getRanks(genome);
    return response[0].emea.rank;
  } catch (err) {
    throw err;
  }
};