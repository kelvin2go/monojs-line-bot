"use strict";
const line = require('@line/bot-sdk');
const weather = require('../weather/weather.controller.js')
const CRYPTO = require('../lib/crypto.js')
const YOUTUBE = require('../lib/youtube.js')
const DRINK = require('../lib/drink.js')
const WITAI = require('../lib/witai.js')

const LINEAction = require('../lib/LINEAction.js')
// const FIREBASE = require('../lib/firebase.js')

const dd = process.env.NODE_ENV !== 'production'

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
// base URL for webhook server
const baseURL = process.env.BASE_URL
// create LINE SDK client
const client = new line.Client(config)
const menu = {
  start: ['開始', 'hi', 'hello'],
  youtube: ['yt'],
  crypto: ['cp'],
  weather: ['天氣'],
  qrcode: ['qr', 'share bot']
}

const EventHandler = {
  postback: async (event) => {
    const replyToken = event.replyToken
    const postBackData = event.postback.data
    const userId = event.source.userId
    if (dd) console.log(postBackData)
    const actionMap = JSON.parse('{"' + decodeURI(postBackData.replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}')
    const key = Object.keys(actionMap)[0]
    if (key) {
      if (dd) console.log(key, actionMap[key])

      console.log(`calling ${key}`)
      await LINEAction.postback[key]({
        replyToken,
        key,
        actionMap,
        userId,
        event,
      })

    }
  }
}
const LINE = {
  middleware: () => {
    return line.middleware(config)
  },
  getProfile: async (userId) => {
    let profile = {}
    if (userId) {
      await DRINK.addUser(userId)
    }
    return profile
  },
  // simple reply function
  replyText: (token, texts) => {
    let ntexts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
      token,
      ntexts.map((text) => ({ type: 'text', text }))
    );
  },
  replyYTCarousel: (token, keywords, images) => {
    let results = Array.isArray(images) ? images : [images];
    const columns = results.map((img) => ({
      thumbnailImageUrl: img.thumbnails.high.url.substring(0, 1000),
      title: img.title.substring(0, 40),
      text: img.channelTitle.substring(0, 60),
      actions: [
        { label: 'Go Youtube', type: 'uri', uri: img.link },
        { label: 'Detail', type: 'message', text: img.description.substring(0, 300) }
      ]
    }))
    return client.replyMessage(
      token,
      {
        type: 'template',
        altText: keywords,
        template: {
          type: 'carousel',
          columns
        }
      })
  },
  replySticker: async (message, replyToken) => {
    return client.replyMessage(
      replyToken,
      {
        type: 'sticker',
        packageId: message.packageId,
        stickerId: message.stickerId,
      }
    )
  },

  handleText: async (message, replyToken, source) => {
    // const curProfile = await client.getProfile(source.userId)
    const trimText = message.text.trim()
    const featureKey = trimText.split(' ')
    const key = featureKey[0].toLowerCase()
    const userId = source.userId
    const witIntent = await WITAI.getIntent(trimText)
    console.log(witIntent)
    let intent = ''
    const menuKeywords = ['menu', 'hi', '跟團號', '團號']

    let featureValue = [...featureKey]
    featureValue.shift()
    featureValue = featureValue.join(' ')
    if (source.userId) {
      await DRINK.addUser(userId)
    }

    // WIT
    if (witIntent.hasOwnProperty('entities')) {
      const sortedEntities = Object.keys(witIntent.entities).sort((a, b) => {
        return witIntent.entities[b][0].confidence - witIntent.entities[a][0].confidence
      })
      const firstKey = sortedEntities[0]
      const firstElement = witIntent.entities[firstKey][0]
      if (firstElement.hasOwnProperty('confidence')) {
        if (firstElement.confidence * 100 > 88 || firstKey.startsWith('drink_name')) {
          intent = {
            key: firstKey,
            value: firstElement.value
          }
        } else if (menuKeywords.indexOf(key) === -1) {
          console.log(`Too low confidence ${firstElement.confidence}`)
          return client.replyMessage(
            replyToken,
            [
              {
                "type": "text",
                "text": `你說的 '${trimText}' 是跟 '${firstElement.value}' 相關的嗎？ (${(firstElement.confidence * 100).toFixed(2)}%)`,
              },
              {
                type: 'template',
                altText: 'correcting words',
                template: {
                  type: 'confirm',
                  text: `你說的 '${trimText}' 是跟 '${firstElement.value}' 相關的嗎？ (${(firstElement.confidence * 100).toFixed(2)}%)`,
                  actions: [
                    { label: 'Yes', type: 'message', text: `${firstElement.value}` },
                    { label: 'No', type: 'message', text: `否! ${firstElement.value}` },
                  ],
                },
              }
            ]
          )
        }
      }
    }
    console.log(intent)

    if (LINEAction.textHandler.hasOwnProperty(intent.key)) {
      console.log(`calling ${intent.key}`)
      await LINEAction.textHandler[intent.key]({
        replyToken,
        featureKey,
        userId,
        intent,
      })
    }

    if (LINEAction.textHandler.hasOwnProperty(key)) {
      console.log(`calling ${key}`)
      await LINEAction.textHandler[key]({
        replyToken,
        featureKey,
        userId,
        intent,
      })
    }

    if (intent.hasOwnProperty('key') && intent.key.startsWith('drink_name')) {
      await LINEAction.textHandler['drink_name']({
        replyToken,
        featureKey,
        userId,
        intent,
        witIntent,
      })
    }

    // other utils
    if ((intent.key === 'bot_feature' && intent.value === 'youtube') || intent.key === 'youtube' || key === 'youtube' || menu.youtube.indexOf(key) > -1) {
      if (source.userId) {
        let youtubeInfo = []
        if (featureKey.length > 1) {
          youtubeInfo = await YOUTUBE.search(featureValue)
        } else {
          youtubeInfo = await YOUTUBE.getTop5()
        }
        // const youtubeStr = youtube.toString(youtubeInfo)
        return LINE.replyYTCarousel(
          replyToken, `${featureValue} `, youtubeInfo
        )
      } else {
        return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
      }
    }


    if ((intent.key === 'bot_feature' && intent.value === 'resturants') || intent.key === 'resturants' || key === 'resturants') {
      const resturants = await DRINK.getIndex()
      const resturantsList = resturants.map((x) => {
        return {
          "type": "button",
          "style": "primary",
          "color": "#0B4C5F",
          "action": {
            "type": "message",
            "text": `${x.fields.Name}`,
            "label": `${x.fields.Name}`
          }
        }
      })
      return client.replyMessage(
        replyToken,
        {
          "type": "flex",
          "altText": "all resturant",
          "contents": {
            "type": "bubble",
            "body": {
              "type": "box",
              "layout": "vertical",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "現在所有的店：",
                  "wrap": true,
                  "weight": "bold",
                  "size": "xl"
                }
              ]
            },
            "footer": {
              "type": "box",
              "layout": "vertical",
              "spacing": "sm",
              "contents": resturantsList
            }
          }
        }
      )
    }
    if ((intent.key === 'bot_feature' && intent.value === 'crypto') || intent.key === 'crypto' || key === 'crypto' || menu.crypto.indexOf(key) > -1) {
      if (source.userId) {
        let cryptoInfo = []
        if (featureKey.length > 1) {
          cryptoInfo = await CRYPTO.getCrypto(featureValue)
        } else {
          cryptoInfo = await CRYPTO.getTop10()
        }
        const cryptoStr = CRYPTO.toString(cryptoInfo)
        return LINE.replyText(
          replyToken,
          [
            `Crypto ${featureValue || `Top10`}: \n${cryptoStr} `
          ]
        )
      } else {
        return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
      }
    }

    if ((intent.key === 'bot_feature' && intent.value === 'weather') || intent.key === 'weather' || intent.key === 'earthquake' || key === 'weather') {
      if (source.userId) {
        const weatherInfo = await weather.getWeather()
        // const weatherStr = weather.toString(weatherInfo)

        return client.replyMessage(
          replyToken,
          {
            "type": "flex",
            "altText": "weather message",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": weather.toLineBlock(weatherInfo)
              }
            }
          }
        )
      } else {
        return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
      }
    }

    if ((intent.key === 'bot_feature' && intent.value === 'qrcode') || intent.key === 'qrcode' || key === 'qrcode' || menu.qrcode.indexOf(key) > -1) {
      if (source.userId) {
        return client.replyMessage(
          replyToken,
          {
            "type": "flex",
            "altText": "menu",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                  {
                    "type": "text",
                    "text": "開DIN 開團訂飲料 聊天機械人",
                    "wrap": true,
                    "weight": "bold",
                    "gravity": "center",
                    "size": "xl"
                  },
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
                            "text": "感謝你 分享 share - 開DIN BOT",
                            "wrap": true
                          }
                        ]
                      },
                      {
                        "type": "box",
                        "layout": "baseline",
                        "spacing": "sm",
                        "contents": [
                          {
                            "type": "text",
                            "text": "如想加入更多功能 / 反饋問題，請用GITHUB",
                            "wrap": true
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "xxl",
                    "contents": [
                      {
                        "type": "spacer"
                      },
                      {
                        "type": "image",
                        "url": `${baseURL}/static/din.png`,
                        "aspectMode": "cover",
                        "size": "xl"
                      },
                      {
                        "type": "text",
                        "text": "You can share this Qrcode for adding this bot",
                        "color": "#aaaaaa",
                        "wrap": true,
                        "margin": "xxl",
                        "size": "xs"
                      }
                    ]
                  }
                ]
              },
              "footer": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "button",
                    "action": {
                      "type": "uri",
                      "label": "Github",
                      "uri": "https://github.com/kelvin2go/monojs-line-bot"
                    }
                  }, {
                    "type": "button",
                    "action": {
                      "type": "uri",
                      "label": "開發者網頁",
                      "uri": "https://kelvinho.js.org"
                    }
                  }
                ]
              }
            }
          }
        )
      } else {
        return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
      }
    }

    switch (featureKey[0]) {
      default: {
        console.log(`Echo message to ${replyToken}: ${message.text} `);
        return LINE.replyText(replyToken, message.text);
      }
    }
  },

  handleEvent: async (event) => {
    if (event.replyToken === '00000000000000000000000000000000' ||
      event.replyToken === 'ffffffffffffffffffffffffffffffff') {
      return;
    }
    switch (event.type) {
      case 'message': {
        const message = event.message
        switch (message.type) {
          case 'text':
            return await LINE.handleText(message, event.replyToken, event.source);
          // case 'image':
          //   return handleImage(message, event.replyToken);
          // case 'video':
          //   return handleVideo(message, event.replyToken);
          // case 'audio':
          //   return handleAudio(message, event.replyToken);
          // case 'location':
          //   return handleLocation(message, event.replyToken);
          case 'sticker':
            return LINE.replySticker(message, event.replyToken);
          default:
            throw new Error(`Unknown message: ${JSON.stringify(message)} `);
        }
      }
      case 'follow': {
        return LINE.replyText(event.replyToken, 'Got followed event');
      }

      case 'unfollow': {
        return console.log(`Unfollowed this bot: ${JSON.stringify(event)} `);
      }
      case 'join': {
        return LINE.replyText(event.replyToken, `Joined ${event.source.type} `);
      }
      case 'leave': {
        return console.log(`Left: ${JSON.stringify(event)} `);
      }
      case 'postback': {
        EventHandler.postback(event)
        return
      }
      case 'beacon': {
        return LINE.replyText(event.replyToken, `Got beacon: ${event.beacon.hwid} `);
      }
      default: {
        throw new Error(`Unknown event: ${JSON.stringify(event)} `);
      }
    }
  },
  pushMessage: (profile, texts) => {
    texts = Array.isArray(texts) ? texts : [texts];
    client.pushMessage(profile.userId,
      texts.map((text) => ({ type: 'text', text }))
    )
  },
  multicast: (userIds, texts) => {
    texts = Array.isArray(texts) ? texts : [texts];
    client.multicast(userIds,
      texts.map((text) => ({ type: 'text', text }))
    )
  }
}

module.exports = LINE
