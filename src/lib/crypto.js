'use strict';
const cachios = require('cachios')

const API_URL = {
  all: {limit: '500'},
  coinMarket: `https://api.coinmarketcap.com/v2/ticker/`,
  listing: `https://api.coinmarketcap.com/v2/listings/`
}

const CRYPTO = {
  allCrypto: [],
  getListing: async () => {
    const data = await cachios.get(API_URL.listing)
    CRYPTO.allCrypto = data.data.data
  },
  checkCrypto: async (name) => {
    let result = {}
    for (let key in CRYPTO.allCrypto) {
      const elm = CRYPTO.allCrypto[key]
      if (elm.symbol.toLowerCase() === name.toLowerCase()) {
        result = elm;
        break;
      }
    }
    // console.log(result)
    return result
  },
  toString: (cryptos) => {
    // console.log(cryptos)
    let msg = Object.keys(cryptos).map( (key) => {
      const x = cryptos[key]
      let result = `\n${x.name}: `
      if ('quotes' in x) {
        if ('USD' in x.quotes) {
          result += ` USD\t${x.quotes.USD.price.toFixed(2)}`
        }
        if ('TWD' in x.quotes) {
          result += ` TWD\t${x.quotes.TWD.price.toFixed(2)}`
        }
      }
      return result
    })
    return msg
  },
  getTop10: async () => {        
    let result = await cachios.get(API_URL.coinMarket+'?limit=10&convert=twd')
    return result.data.data
  },
  getCrypto: async (crypto) => {
    let search = await CRYPTO.checkCrypto(crypto)
    let result = await cachios.get(API_URL.coinMarket+`${search.id}/?convert=twd`)
    return { crypto: result.data.data }
  },
}
CRYPTO.getListing() 

module.exports = CRYPTO
