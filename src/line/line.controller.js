"use strict";
const line = require('@line/bot-sdk');
const weather = require('../weather/weather.controller.js')
const CRYPTO = require('../lib/crypto.js')
const YOUTUBE = require('../lib/youtube.js')
const DRINK = require('../lib/drink.js')
const WITAI = require('../lib/witai.js')
const FIREBASE = require('../lib/firebase.js')

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
// console.log(config)
// console.log(process.env)
// base URL for webhook server
const baseURL = process.env.BASE_URL;
var usersList = [];
// create LINE SDK client
const client = new line.Client(config);
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
    console.log(postBackData)
    const actionMap = JSON.parse('{"' + decodeURI(postBackData.replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}')
    const key = Object.keys(actionMap)[0]
    if (key) {
      console.log(key, actionMap[key])
      if (key === 'DATE' || key === 'TIME' || key === 'DATETIME') {
        const textdata = `${key} (${JSON.stringify(event.postback.params)})`
        return LINE.replyText(replyToken, `Got postback: ${textdata}`)
      }

      if (key === 'drinkMenu') {
        const resturant = await DRINK.resturantSearch(actionMap[key])

        return client.replyMessage(
          replyToken,
          {
            type: 'image',
            originalContentUrl: resturant.image.menu.url,
            previewImageUrl: resturant.image.menu.url,
          }
        )
      }

      if (key === 'allResturant') {
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

      if (key === 'startDrinkOrder') {
        // const currentUser = await LINE.getProfile(event.source.userId)
        const resturant = await DRINK.resturantSearch(actionMap[key])
        const order = await DRINK.createOwnerOrder(userId, resturant)

        if (order) {
          // const list = await DRINK.getResturantDrinks(resturant.index)
          // console.log(list)
          // console.log(order)
          // const drinkList = _sampleSize(list, 13).map(x => {
          //   return {
          //     "type": "action",
          //     "imageUrl": "https://example.com/tempura.png",
          //     "action": {
          //       "type": "postback",
          //       "label": x.fields.Name,
          //       "text": x.fields.Name,
          //       "data": `drinkOrder=${order.id}&drinkId=${x.id}&drinkName=${x.fields.Name}`,
          //     }
          //   }
          // })
          DRINK.startPendingOrder(userId, order.id)
          return client.replyMessage(
            replyToken,
            [
              {
                "type": "text",
                "text": `你的 ${resturant.name} 團已開：(團號如下，分享團號讓別人加入)`
              },
              {
                "type": "text",
                "text": `跟團號 ${order.id}`
              },
              {
                "type": "text",
                "text": "請問你要喝什麼? "
              }
            ]
          )
        }
      }

      if (key === 'joinGroupOrder') {
        // const currentUser = await LINE.getProfile(event.source.userId)
        const orderId = actionMap['orderId']
        if (orderId && orderId !== 'undefined') {
          console.log("start sending order")
          // `setDrinkOrder=start&orderId=${pendingOrder[0]}&drink=${x.fields.Name}&size=large`
          DRINK.startPendingOrder(userId, orderId)
          return client.replyMessage(
            replyToken,
            [
              {
                "type": "text",
                "text": `你在跟 ${actionMap['resturant']} 團`
              },
              {
                "type": "text",
                "text": "請問你要喝什麼? "
              }
            ]
          )
        }
      }

      if (key === 'setDrinkOrder') {
        console.log("start sending order2")
        const orderId = actionMap['orderId']
        if (orderId && orderId !== 'undefined') {
          console.log("start sending order")
          // `setDrinkOrder=start&orderId=${pendingOrder[0]}&drink=${x.fields.Name}&size=large`
          await DRINK.sendOrder(userId, orderId, {
            drink: actionMap['drink'],
            size: actionMap['size'],
            price: actionMap['price']
          })

          DRINK.clearPendingOrder(userId)
          return client.replyMessage(
            replyToken,
            [
              {
                "type": "text",
                "text": `已成功跟團`
              },
              {
                "type": "text",
                "text": "如要檢查結果:"
              },
              {
                "type": "text",
                "text": `查團 ${orderId}`
              }
            ]
          )
        } else { // ask for 開團


        }

      }



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
      profile = await client.getProfile(userId)
      if (profile) {
        FIREBASE.addUser(profile)
        usersList = {
          ...usersList,
          [userId]: profile
        }
      }
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
  wrapDrink: (resturant, drink, drinkButtons) => {
    return {
      "type": "flex",
      "altText": "Confirm Drink",
      "contents": {
        "type": "bubble",

        "body": {
          "type": "box",
          "layout": "vertical",
          "spacing": "md",
          "action": {
            "type": "uri",
            "uri": "https://linecorp.com"
          },
          "contents": [
            {
              "type": "text",
              "text": `${resturant.name} ${drink.fields.Name}`,
              "wrap": true,
              "size": "lg"
            },
            {
              "type": "text",
              "text": "請確認：",
              "wrap": true,
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "spacing": "sm",
              "contents": drinkButtons
            }
          ]
        }
      }
    }
  },
  handleText: async (message, replyToken, source) => {
    const buttonsImageURL = `${baseURL}/static/buttons/1040.jpg`;
    // const curProfile = await client.getProfile(source.userId)
    const trimText = message.text.trim()
    const featureKey = trimText.split(' ')
    const key = featureKey[0].toLowerCase()
    const userId = source.userId
    const witIntent = await WITAI.getIntent(trimText)
    console.log(witIntent)
    let intent = ''

    if (key.startsWith('跟團號') || key.startsWith('團號')) {
      if (userId) {
        try {
          const order = await DRINK.getOrder(featureKey[1])
          // console.log(order)
          if (order) {
            const owner = await DRINK.getUser(order.fields.owner)
            const resturant = await DRINK.resturantSearch(order.fields.restaurant_index[0])
            const allOrders = JSON.parse(order.fields.order || "[]")
            const isOwner = userId === order.fields.owner
            const total = allOrders.length > 0 ? allOrders.map((x) => parseInt(x.drink.price)).reduce((accu, cur) => accu + parseInt(cur)) : 0
            const convertOrderInfo = (orders) => {
              return orders.map(x => {
                return {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "text",
                      "text": `${x.username} ${x.drink.drink} ${x.drink.size === 'large' ? '大' : x.drink.size === 'medium' ? '中' : ''}`,
                      "size": "sm",
                      "color": "#555555",
                      "flex": 0
                    },
                    {
                      "type": "text",
                      "text": `$${x.drink.price}`,
                      "size": "sm",
                      "color": "#111111",
                      "align": "end"
                    }
                  ]
                }
              })
            }
            const groupInfo = isOwner ? convertOrderInfo(allOrders) : convertOrderInfo(allOrders.filter(x => x.user === userId))
            const groupContainer = {
              "type": "box",
              "layout": "vertical",
              "margin": "xxl",
              "spacing": "sm",
              "contents": groupInfo
            }
            return client.replyMessage(
              replyToken,
              {
                "type": "flex",
                "altText": "找到團",
                "contents": {
                  "type": "bubble",
                  "body": {
                    "type": "box",
                    "layout": "vertical",
                    "spacing": "md",
                    "contents": [
                      {
                        "type": "text",
                        "text": `${resturant.name}`,
                        "size": "xl",
                        "weight": "bold"
                      },
                      {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "sm",
                        "contents": [
                          {
                            "type": "box",
                            "layout": "baseline",
                            "contents": [
                              {
                                "type": "text",
                                "text": `${owner.fields.displayName} 開的團`,
                                "weight": "bold",
                                "margin": "sm",
                                "flex": 0
                              }
                            ]
                          },
                        ]
                      },
                      {
                        "type": "text",
                        "text": `${new Date(order.createdTime).toString()}`,
                        "size": "sm",
                        "align": "end",
                        "color": "#aaaaaa"
                      },
                      {
                        "type": "text",
                        "text": `己有 ${allOrders.length} 飲料/單`,
                        "wrap": true,
                        "color": "#aaaaaa",
                        "size": "xs"
                      },
                      {
                        "type": "separator",
                        "margin": "xxl"
                      },
                      groupContainer,
                      {
                        "type": "separator",
                        "margin": "xxl"
                      },
                      {
                        "type": "text",
                        "text": `總 $${total}`,
                        "wrap": true,
                        "color": "#aaaaaa",
                        "size": "xs",
                        "align": "end"
                      }

                    ]
                  },
                  "footer": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                      {
                        "type": "button",
                        "style": "primary",
                        "action": {
                          "type": "postback",
                          "label": "確定跟團",
                          "data": `joinGroupOrder=true&orderId=${order.id}&resturant=${resturant.name}`
                        }
                      },
                      {
                        "type": "button",
                        "style": "link",
                        "action": {
                          "type": "postback",
                          "label": "不是",
                          "data": "no"
                        }
                      },
                      {
                        "type": "button",
                        "style": "link",
                        "height": "sm",
                        "action": {
                          "type": "postback",
                          "label": "飲品價目表",
                          "data": `drinkMenu=${resturant.name}`
                        }
                      },
                    ]
                  }
                }
              }
            )
          }
        } catch (err) {
          console.log(err)
          return LINE.replyText(
            replyToken,
            [
              `找不到 團號 ${featureKey[1]}`
            ]
          )
        }
      }

    }

    // WIT
    if (witIntent.hasOwnProperty('entities')) {
      const firstKey = Object.keys(witIntent.entities)[0]
      const firstElement = witIntent.entities[firstKey][0]
      if (firstElement.hasOwnProperty('confidence')) {
        if (firstElement.confidence * 100 > 90) {
          intent = {
            key: firstKey,
            value: firstElement.value
          }
        } else {
          console.log(`Too low confidence ${firstElement.confidence}`)

          return LINE.replyText(
            replyToken,
            [
              `你是在說 "${firstElement.value}" 相關的嗎？\n (guess rate: ${firstElement.confidence * 100}%)`
            ]
          )
        }
      }
    }
    console.log(intent)
    if (intent.key === 'menu' || intent.key === 'greetings') {
      return client.replyMessage(
        replyToken,
        client.replyMessage(
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
                    "text": "我的功能單 ：",
                    "size": "xl",
                    "weight": "bold"
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "box",
                        "layout": "baseline",
                        "spacing": "sm",
                        "contents": [
                          {
                            "type": "text",
                            "text": "Youtube",
                            "color": "#aaaaaa",
                            "size": "sm",
                            "flex": 2
                          },
                          {
                            "type": "text",
                            "text": "youtube burno mars, yt 周杰倫",
                            "wrap": true,
                            "color": "#666666",
                            "size": "sm",
                            "flex": 5
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
                            "text": "天氣",
                            "color": "#aaaaaa",
                            "size": "sm",
                            "flex": 2
                          },
                          {
                            "type": "text",
                            "text": "天氣, 地震, weather ",
                            "wrap": true,
                            "color": "#666666",
                            "size": "sm",
                            "flex": 5
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
                            "text": "Crypto",
                            "color": "#aaaaaa",
                            "size": "sm",
                            "flex": 2
                          },
                          {
                            "type": "text",
                            "text": "crypto, crypto BTC, 加密 ETH",
                            "wrap": true,
                            "color": "#666666",
                            "size": "sm",
                            "flex": 5
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
                            "text": "訂飲料",
                            "color": "#aaaaaa",
                            "size": "sm",
                            "flex": 2
                          },
                          {
                            "type": "text",
                            "text": "開團, 迷克夏, 團號 XXXX",
                            "wrap": true,
                            "color": "#666666",
                            "size": "sm",
                            "flex": 5
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "button",
                    "style": "link",
                    "height": "sm",
                    "action": {
                      "type": "message",
                      "label": "youtube 周杰倫",
                      "text": "youtube 周杰倫"
                    }
                  },
                  {
                    "type": "button",
                    "style": "link",
                    "height": "sm",
                    "action": {
                      "type": "message",
                      "label": "天氣",
                      "text": "天氣"
                    }
                  },
                  {
                    "type": "button",
                    "style": "link",
                    "height": "sm",
                    "action": {
                      "type": "postback",
                      "label": "飲料店",
                      "data": "allResturant=true"
                    }
                  },
                  {
                    "type": "button",
                    "style": "link",
                    "height": "sm",
                    "action": {
                      "type": "message",
                      "label": "迷克夏",
                      "text": "迷克夏"
                    }
                  },
                  {
                    "type": "button",
                    "style": "primary",
                    "action": {
                      "type": "message",
                      "label": "開團",
                      "text": "開團"
                    }
                  }
                ]
              }
            }
          }
        )
      )
    }

    let featureValue = [...featureKey]
    featureValue.shift()
    featureValue = featureValue.join(' ')
    if (source.userId) {
      client.getProfile(userId)
        .then((profile) => {
          FIREBASE.addUser(profile)
          usersList = {
            ...usersList,
            [source.userId]: profile
          }
          console.log(usersList)
        })
    }
    // if (key === 'start' || menu.start.indexOf(key) > -1) {
    //   if (userId) {
    //     const profile = await client.getProfile(userId)
    //     let greeting = `您好 ${profile.displayName}\n,`

    //     return LINE.replyText(
    //       replyToken,
    //       [
    //         greeting,
    //         `選單: ${Object.keys(menu).map((x) => {
    //           return '\n' + [x, ...menu[x]].join(', ')
    //         })} \n`
    //       ]
    //     )
    //   } else {
    //     return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
    //   }
    // }

    if (intent.key === 'drink_resturant') {
      console.log('sending resutant image')
      const resturant = await DRINK.resturantSearch(intent.value)
      return client.replyMessage(
        replyToken,
        {
          "type": "flex",
          "altText": `${resturant.name} info card`,
          "contents": {
            "type": "bubble",
            "hero": {
              "type": "image",
              "url": resturant.image.logo.url,
              "size": "full",
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": resturant.intro,
                  "wrap": true,
                  "color": "#666666",
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
                  "style": "link",
                  "height": "sm",
                  "action": {
                    "type": "postback",
                    "label": "飲品價目表",
                    "data": `drinkMenu=${resturant.name}`
                  }
                },
                {
                  "type": "button",
                  "style": "link",
                  "height": "sm",
                  "action": {
                    "type": "postback",
                    "label": "開團",
                    "data": `startDrinkOrder=${resturant.name}`
                  }
                },
                {
                  "type": "button",
                  "style": "link",
                  "height": "sm",
                  "action": {
                    "type": "uri",
                    "label": "官網",
                    "uri": resturant.url
                  }
                },
                {
                  "type": "spacer",
                  "size": "sm"
                }
              ],
              "flex": 0
            }
          }
        }
      )

    }

    if (intent.key === 'start_drink_order') {
      console.log('Starting order')
      const drinkResutrant = await DRINK.resturantSearch(intent.value)
      // console.log(drinkResutrant)
      const pic = drinkResutrant[0].fields.menu[0]
      // console.log(pic)
      return client.replyMessage(
        replyToken,
        {
          type: 'image',
          originalContentUrl: pic.url,
          previewImageUrl: pic.url,
        }
      )
    }

    if (intent.key.startsWith('drink_name')) {
      const restName = intent.key.replace('drink_name_', '')
      const resturant = await DRINK.resturantSearch(restName)
      console.log(resturant)
      const drinks = await DRINK.searchDrink(resturant.index, intent.value)
      const pendingOrder = DRINK.hasPendingOrder(userId)
      let pendingMsg = {}
      if (pendingOrder) {
        const pendingOrderObject = await DRINK.getOrder(pendingOrder)
        if (pendingOrderObject) {
          if (pendingOrderObject.restaurant_index !== resturant.index) {
            pendingMsg = {
              type: 'text', text: `找到的 飲料 跟 開團的不一樣哦! 請確定這家有 '${intent.value}'`
            }
          }
        }
      } else {
        pendingMsg = { type: 'text', text: "可是你還沒開團/跟團" }
      }
      console.log(pendingOrder)
      const drinkButtons = drinks.slice(0, 3).map((x, index) => {
        const result = []
        const medium = x.fields.medium ?
          {
            "type": "button",
            "style": "primary",
            ... (index === 0 ? null : { color: "#905c44" }),
            "action": {
              "type": "postback",
              "label": `中 $${x.fields.medium} `,
              "data": `setDrinkOrder = start & orderId=${pendingOrder[0]}& drink=${x.fields.Name}& size=medium & price=${x.fields.medium} `
            }
          }
          : null

        const large = x.fields.large ?
          {
            "type": "button",
            "style": "primary",
            ... (index === 0 ? null : { color: "#905c44" }),
            "action": {
              "type": "postback",
              "label": `大 $${x.fields.large} `,
              "data": `setDrinkOrder = start & orderId=${pendingOrder[0]}& drink=${x.fields.Name}& size=large & price=${x.fields.large} `
            }
          }
          : null
        if (medium) result.push(medium)
        if (large) result.push(large)
        return result
      })

      return client.replyMessage(
        replyToken,
        [
          drinks.slice(0, 3).map((x, index) => {
            return LINE.wrapDrink(resturant, x, drinkButtons[index])
          }).reverse(),
          pendingMsg
        ]
      )
    }


    // other utils
    if (intent.key === 'youtube' || key === 'youtube' || menu.youtube.indexOf(key) > -1) {
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
    if (intent.key === 'crypto' || key === 'crypto' || menu.crypto.indexOf(key) > -1) {
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

    if (key === 'pendingOrder') {
      if (source.userId) {
        DRINK.hasPendingOrder(userId)
        return LINE.replyText(
          replyToken,
          [
          ]
        )
      } else {
        return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
      }
    }

    if (intent.key === 'weather' || intent.key === 'earthquake' || key === 'weather') {
      if (source.userId) {
        const weatherInfo = await weather.getWeather()
        const weatherStr = weather.toString(weatherInfo)
        return LINE.replyText(
          replyToken,
          [
            `天氣注意: \n${weatherStr.warning} `,
            `最近地震: \n${weatherStr.earthquake} `
          ]
        )
      } else {
        return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
      }
    }

    if (intent.key === 'qrcode' || key === 'qrcode' || menu.qrcode.indexOf(key) > -1) {
      if (source.userId) {
        return client.replyMessage(
          replyToken,
          {
            type: 'imagemap',
            baseUrl: `${baseURL}/static/bot-qr.png`,
            altText: 'QRcode ',
            baseSize: { width: 180, height: 180 },
            actions: [
            ],
          }
        );
      } else {
        return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
      }
    }


    switch (featureKey[0]) {
      case 'profile':
        if (source.userId) {
          return client.getProfile(source.userId)
            .then((profile) => {
              LINE.replyText(
                replyToken,
                [
                  `Display name: ${profile.displayName} `,
                  `Status message: ${profile.statusMessage} `,
                ]
              )
            });
        } else {
          return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
        }
      case 'buttons':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Buttons alt text',
            template: {
              type: 'buttons',
              thumbnailImageUrl: buttonsImageURL,
              title: 'My button sample',
              text: 'Hello, my button',
              actions: [
                { label: 'Go to line.me', type: 'uri', uri: 'https://line.me' },
                { label: 'Say hello1', type: 'postback', data: 'hello こんにちは' },
                { label: '言 hello2', type: 'postback', data: 'hello こんにちは', text: 'hello こんにちは' },
                { label: 'Say message', type: 'message', text: 'Rice=米' },
              ],
            },
          }
        );
      case 'confirm':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Confirm alt text',
            template: {
              type: 'confirm',
              text: 'Do it?',
              actions: [
                { label: 'Yes', type: 'message', text: 'Yes!' },
                { label: 'No', type: 'message', text: 'No!' },
              ],
            },
          }
        )
      case 'carousel':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Carousel alt text',
            template: {
              type: 'carousel',
              columns: [
                {
                  thumbnailImageUrl: buttonsImageURL,
                  title: 'hoge',
                  text: 'fuga',
                  actions: [
                    { label: 'Go to line.me', type: 'uri', uri: 'https://line.me' },
                    { label: 'Say hello1', type: 'postback', data: 'hello こんにちは' },
                  ],
                },
                {
                  thumbnailImageUrl: buttonsImageURL,
                  title: 'hoge',
                  text: 'fuga',
                  actions: [
                    { label: '言 hello2', type: 'postback', data: 'hello こんにちは', text: 'hello こんにちは' },
                    { label: 'Say message', type: 'message', text: 'Rice=米' },
                  ],
                }
              ],
            }
          }
        );
      case 'image_carousel':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Image carousel alt text',
            template: {
              type: 'image_carousel',
              columns: [
                {
                  imageUrl: buttonsImageURL,
                  action: { label: 'Go to LINE', type: 'uri', uri: 'https://line.me' },
                },
                {
                  imageUrl: buttonsImageURL,
                  action: { label: 'Say hello1', type: 'postback', data: 'hello こんにちは' },
                },
                {
                  imageUrl: buttonsImageURL,
                  action: { label: 'Say message', type: 'message', text: 'Rice=米' },
                },
                {
                  imageUrl: buttonsImageURL,
                  action: {
                    label: 'datetime',
                    type: 'datetimepicker',
                    data: 'DATETIME',
                    mode: 'datetime',
                  },
                },
              ]
            },
          }
        );
      case 'datetime':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Datetime pickers alt text',
            template: {
              type: 'buttons',
              text: 'Select date / time !',
              actions: [
                { type: 'datetimepicker', label: 'date', data: 'DATE', mode: 'date' },
                { type: 'datetimepicker', label: 'time', data: 'TIME', mode: 'time' },
                { type: 'datetimepicker', label: 'datetime', data: 'DATETIME', mode: 'datetime' },
              ],
            },
          }
        );
      case 'imagemap':
        return client.replyMessage(
          replyToken,
          {
            type: 'imagemap',
            baseUrl: `${baseURL} / static / rich`,
            altText: 'Imagemap alt text',
            baseSize: { width: 1040, height: 1040 },
            actions: [
              { area: { x: 0, y: 0, width: 520, height: 520 }, type: 'uri', linkUri: 'https://store.line.me/family/manga/en' },
              { area: { x: 520, y: 0, width: 520, height: 520 }, type: 'uri', linkUri: 'https://store.line.me/family/music/en' },
              { area: { x: 0, y: 520, width: 520, height: 520 }, type: 'uri', linkUri: 'https://store.line.me/family/play/en' },
              { area: { x: 520, y: 520, width: 520, height: 520 }, type: 'message', text: 'URANAI!' },
            ],
          }
        );
      case 'bye': {
        switch (source.type) {
          case 'user':
            return LINE.replyText(replyToken, 'Bot can\'t leave from 1:1 chat');
          case 'group':
            return LINE.replyText(replyToken, 'Leaving group')
              .then(() => client.leaveGroup(source.groupId));
          case 'room':
            return LINE.replyText(replyToken, 'Leaving room')
              .then(() => client.leaveRoom(source.roomId));
        }
      }
        break;
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
