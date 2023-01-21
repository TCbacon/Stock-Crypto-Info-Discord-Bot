const djs = require("discord.js");
const axios = require('axios').default;
require('dotenv').config();

const bot = new djs.Client({
  intents: [
    "GUILDS",
    "GUILD_MESSAGES"
  ]
});

const Commands = {
  STOCKINFO: 'stockinfo',
  CRYPTOINFO: 'cryptoinfo'
};

const Type = {
  STOCK: 'stock',
  CRYPTO: 'crypto'
};

const config = process.env;

const fetchCrypto = async (symbol) => {

  const APIKEY = config.COIN_MARKET_CAP_API;
  const URL = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`;

  try {
    const response = await axios.get(URL, {
      headers: {
        'X-CMC_PRO_API_KEY': APIKEY,
      },
    });

    const coinData = response.data.data[symbol];
    const result = buildCryptoInfo(coinData);
    return result;

  }

  catch (error) {
    console.error(error);
    return null;
  }
};

const fetchStock = async (name) => {
  const APIKEY = config.APP_STOCK_API;
  const SYMBOL = name;
  const APICALL = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${SYMBOL}&interval=60min&apikey=${APIKEY}`;

  try {
    const response = await axios.get(APICALL);
    let data = response.data;
    let latestDate = data['Meta Data']["3. Last Refreshed"];
    let timeSeriesData = data['Time Series (60min)'][latestDate];
    let stockInfo = buildStockInfo(SYMBOL, latestDate, timeSeriesData);
    return stockInfo;
  }

  catch (error) {
    console.log(error);
    return null;
  }

};

const buildStockInfo = (symbol, latestDate, timeSeriesData) => {

  return {
    dateRefresh: latestDate,
    openPrice: timeSeriesData['1. open'],
    highPrice: timeSeriesData['2. high'],
    lowPrice: timeSeriesData['3. low'],
    closePrice: timeSeriesData['4. close'],
    volume: timeSeriesData['5. volume'],
    ticker: symbol,
    type: Type.STOCK
  };
};

const buildCryptoInfo = (data) => {

  let date = new Date(data.last_updated);
  let formattedDate = date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return {
    ticker: data.symbol,
    price: data.quote.USD.price,
    dateRefresh: formattedDate,
    volume_24h: data.quote.USD.volume_24h,
    volume_change_24h: data.quote.USD.volume_change_24h,
    circulating_supply: data.circulating_supply,
    type: Type.CRYPTO
  };
};

const buildReplyContent = async (msg, props) => {

  let message;

  if (props.type === Type.STOCK) {
    message = `
    ticker: ${props.ticker} 
    date: ${props.dateRefresh}
    open: ${props.openPrice}
    high: ${props.highPrice}
    low: ${props.lowPrice}
    close: ${props.closePrice}
    volume: ${props.volume}
  `;
  }

  else if (props.type === Type.CRYPTO) {
    message = `
    ticker: ${props.ticker},
    price: ${props.price},
    dateRefresh: ${props.dateRefresh},
    volume 24h: ${props.volume_24h},
    volume change 24h: ${props.volume_change_24h},
    circulating supply: ${props.circulating_supply}`;
  }

  await msg.reply({
    content: message,
    ephemeral: false
  });
};

bot.on("ready", () => {

  console.log(`bot ${bot.user.tag} is ready`);
  const guildId = config.GUILD_ID;
  const guild = bot.guilds.cache.find(g => g.id === guildId);
  let commands;

  if (guild) {
    commands = guild.commands;
  }
  else {
    commands = bot.application?.commands;
  }

  commands?.create({
    name: Commands.STOCKINFO,
    description: "stock info",
    options: [{
      name: 'name',
      description: "stock name",
      type: 'STRING'
    }]
  });

  commands?.create({
    name: Commands.CRYPTOINFO,
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

  if (commandName === Commands.STOCKINFO) {

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
  else if (commandName === Commands.CRYPTOINFO) {

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