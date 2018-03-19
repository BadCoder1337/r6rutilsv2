const = require('r6api')({
  email: process.env.R6API_LOGIN,
  password: process.env.R6API_PASSWORD
});

module.exports.getGenome = async function (nick) {
  try {
  let result = {
  sucess: true,
  genome: await r6api.findByName(nick)[0].id;
  }
  return result;
  } catch (err) {
  let result = {
  sucess: false,
  error: err
  }
  return result;
  }
}

module.exports.getRank = async function (genome) {
  try {
  let result = {
  sucess: true,
  rank: await r6api.getRanks(genome)[0].emea.rank;
  }
  return result;
  } catch (err) {
  let result = {
  sucess: false,
  error: err
  }
  return result;
  }
}
