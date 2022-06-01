const djs = require("discord.js");
const axios = require('axios').default;
require('dotenv').config();

const bot = new djs.Client({
  intents: [
    "GUILDS",
    "GUILD_MESSAGES"
  ]
});

const config = process.env;

const fetchCrypto = (name) => {

  const APIKEY = config.APP_STOCK_API;
  let market = 'USD';
  let symbol = name;
  const APICALL = `https://www.alphavantage.co/query?function=CRYPTO_INTRADAY&symbol=${symbol}&market=${market}&interval=60min&apikey=${APIKEY}`;

  return axios.get(APICALL)
    .then(
      function (response) {

        let data = response.data;

        try {
          let latestDate = data['Meta Data']["6. Last Refreshed"];
          let timeSeriesData = data['Time Series Crypto (60min)'][latestDate];
          let cryptoInfo = buildInfo(symbol, latestDate, timeSeriesData);
          return cryptoInfo;
        }

        catch (err) {
          console.log(err);
          return null;
        }

      }, (err) => {
        console.log(err);
        return null;
      }
    );

}

const fetchStock = (name) => {
  const APIKEY = config.APP_STOCK_API;
  let symbol = name;
  const APICALL = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=60min&apikey=${APIKEY}`;

  return axios.get(APICALL)
    .then(
      function (response) {

        let data = response.data;

        try {
          let latestDate = data['Meta Data']["3. Last Refreshed"];
          let timeSeriesData = data['Time Series (60min)'][latestDate];
          let stockInfo = buildInfo(symbol, latestDate, timeSeriesData);
          return stockInfo;
        }

        catch (err) {
          console.log(err);
          return null;
        }

      }, (err) => {
        console.log(err);
        return null;
      }
    );
}

const buildInfo = (symbol, latestDate, timeSeriesData) => {

  return {
    dateRefresh: latestDate,
    openPrice: timeSeriesData['1. open'],
    highPrice: timeSeriesData['2. high'],
    lowPrice: timeSeriesData['3. low'],
    closePrice: timeSeriesData['4. close'],
    volume: timeSeriesData['5. volume'],
    ticker: symbol
  };
}

const buildReplyContent = async (msg, { dateRefresh, openPrice, highPrice, lowPrice, closePrice, volume, ticker }) => {

  let message = `
    ticker: ${ticker} 
    date: ${dateRefresh}
    open: ${openPrice}
    high: ${highPrice}
    low: ${lowPrice}
    close: ${closePrice}
    volume: ${volume}
  `;

  await msg.reply({
    content: message,
    ephemeral: false
  });
}

bot.on("ready", () => {

  console.log(`bot ${bot.user.tag} is ready`);
  const guildId = config.GUILD_ID;
  const guild = bot.guilds.cache.get(guildId);
  let commands;

  if (guild) {
    commands = guild.commands;
  }
  else {
    commands = bot.application?.commands;
  }

  commands?.create({
    name: 'stockinfo',
    description: "stock info",
    options: [{
      name: 'name',
      description: "stock name",
      type: 'STRING'
    }]
  });

  commands?.create({
    name: 'cryptoinfo',
    description: "crypto info",
    options: [{
      name: 'name',
      description: "crypto name",
      type: 'STRING'
    }]
  });
});

bot.on('interactionCreate', async (msg) => {

  if (!msg.isCommand()) {
    return;
  }
  const { commandName, options } = msg;

  if (commandName === 'stockinfo') {

    const name = options.getString('name')?.toUpperCase();
    let info = await fetchStock(name);

    if (!info) {
      await msg.reply({
        content: "Error retrieving stock data...",
        ephemeral: true
      });

      return;
    }

    buildReplyContent(msg, info);

  }
  else if (commandName === 'cryptoinfo') {

    const name = options.getString('name')?.toUpperCase();
    let info = await fetchCrypto(name);

    if (!info) {
      await msg.reply({
        content: "Error retrieving crypto data...",
        ephemeral: true
      });

      return;
    }

    buildReplyContent(msg, info);

  }
});

bot.login(config.TOKEN);