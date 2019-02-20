const cachios = require('cachios')
const cheerio = require('cheerio')

const API = {
  warning: 'https://www.cwb.gov.tw/m/js/warning_info.js',
  earthquake: 'https://www.cwb.gov.tw/V7/modules/MOD_NEWEC.htm'
}

const WEATHER = {
  toString: (weather) => {
    const warning = weather.warning.map(x => {
      return `\n${x.time}: ${x.key}`
    })
    const earthquake = weather.earthquake.map(x => {
      return `\n${x.time}: 震度 ${x.rate} 深 ${x.deep}km 位於 ${x.location}`
    })
    return { warning, earthquake }
  },
  toLineBlock: (weather) => {
    return [
      {
        "type": "box",
        "layout": "vertical",
        "margin": "lg",
        "spacing": "sm",
        "contents": [
          {
            "type": "box",
            "layout": "baseline",
            "spacing": "sm",
            "contents": [
              {
                "type": "text",
                "text": `天氣特報`,
                "size": "sm",
                "weight": "bold",
                "color": "#1a67b1",
                "flex": 1
              }
            ]
          }
        ]
      },
      ...weather.warning.map(x => {
        return {
          "type": "box",
          "layout": "vertical",
          "margin": "lg",
          "spacing": "sm",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": `${x.time}`,
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 3
                },
                {
                  "type": "text",
                  "text": `${x.key}`,
                  "wrap": true,
                  "size": "sm",
                  "color": "#666666",
                  "flex": 4
                }
              ]
            }
          ]
        }
      }),
      {
        "type": "box",
        "layout": "vertical",
        "margin": "lg",
        "spacing": "sm",
        "contents": [
          {
            "type": "box",
            "layout": "baseline",
            "spacing": "sm",
            "contents": [
              {
                "type": "text",
                "text": `震度`,
                "size": "sm",
                "weight": "bold",
                "color": "#1a67b1",
                "flex": 1
              },
              {
                "type": "text",
                "text": `資訊`,
                "wrap": true,
                "weight": "bold",
                "color": "#1a67b1",
                "flex": 4
              }
            ]
          }
        ]
      },
      {
        "type": "separator",
        "margin": "sm"
      },
      ...weather.earthquake.map(x => {
        return {
          "type": "box",
          "layout": "vertical",
          "margin": "lg",
          "spacing": "sm",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": `${x.rate} `,
                  "size": "sm",
                  "weight": "bold",
                  "color": (x.rate > 6.5 ? "#ff0000" :
                    x.rate > 6 ? "#ff7b00" :
                      x.rate > 5.5 ? "#ffd000" : "#00d21b"
                  ),
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": `${x.time}\n ${x.location}\n 深度: ${x.deep}km`,
                  "wrap": true,
                  "size": "sm",
                  "color": "#666666",
                  "flex": 4
                }
              ]
            }
          ]
        }
      }),
    ]

  },
  getWeather: async () => {
    const [warning, earthquake] = await Promise.all([
      cachios.get(API.warning),
      cachios.get(API.earthquake)
    ])

    const patt = /"(.*?)"/gm
    const warningAry = warning.data.match(patt)
    let warnStr = [];
    console.log(warningAry)
    if (warningAry) {
      for (let i = 0; i < warningAry.length; i++) {
        if (i % 3 === 2) {
          warnStr.push({
            time: `${warningAry[i]}`.replace(/"/g, '').replace('2019/', ''),
            key: `${warningAry[i - 1]}`.replace(/"/g, '')
          })
        }
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
