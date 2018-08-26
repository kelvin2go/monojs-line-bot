const cachios = require('cachios')
const cheerio = require('cheerio')

const API = {
  warning: 'https://www.cwb.gov.tw/m/js/warning_info.js',
  earthquake: 'https://www.cwb.gov.tw/V7/modules/MOD_NEWEC.htm'
}

const WEATHER = {
  toString: (weather) => {
    const warning = weather.warning.map( x => {
      return `\n${x.time}: ${x.key}`
    })
    const earthquake = weather.earthquake.map( x => {
      return `\n${x.time}: 震度 ${x.rate} 深 ${x.deep}km 位於 ${x.location}`
    })
    return { warning, earthquake}
  },
  getWeather: async () => {
    const [warning, earthquake] = await Promise.all([
      cachios.get(API.warning),
      cachios.get(API.earthquake)
    ])

    const patt = /"(.*?)"/gm
    const warningAry = warning.data.match(patt)
    let warnStr = [];
    // console.log(warningAry)
    for (let i = 0; i < warningAry.length; i++) {
      if (i % 3 === 2 ) {
        warnStr.push({
          time: `${warningAry[i]}`.replace(/"/g,''),
          key: `${warningAry[i-1]}`.replace(/"/g,'')
        })
      }
    }

    const $ = cheerio.load(earthquake.data)
    const earthquakeJSON = $(".BoxTable tr").map((i, element) => ({
      time: $(element).find('td:nth-of-type(1)').text().trim(),
      rate: $(element).find('td:nth-of-type(2)').text().trim(),
      deep: $(element).find('td:nth-of-type(3)').text().trim(),
      number: $(element).find('td:nth-of-type(4)').text().trim(),
      location: $(element).find('td:nth-of-type(5)').text().trim()
    })).get()
    earthquakeJSON.shift()
    return {
      warning: warnStr,
      earthquake: earthquakeJSON
    }
  }
}

module.exports = WEATHER;
