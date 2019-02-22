'use strict';
const line = require('@line/bot-sdk')
const DRINK = require('./drink.js')

const dd = process.env.NODE_ENV !== 'production'

Date.prototype.yyyymmdd = function () {
  const mm = this.getMonth() + 1
  const dd = this.getDate()
  return `${this.getFullYear()}-${(mm > 9 ? '' : '0') + mm}-${(dd > 9 ? '' : '0') + dd} ${this.getHours()}:${this.getMinutes()}`
}
Date.prototype.daytime = function () {
  const mm = this.getMonth() + 1
  const dd = this.getDate()
  return `${(mm > 9 ? '' : '0') + mm}-${(dd > 9 ? '' : '0') + dd} ${this.getHours()}:${this.getMinutes()}`
}

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
}

const client = new line.Client(config)

const postback = {
  DATE: ({ replyToken, key, event, }) => {
    const textdata = `${key} (${JSON.stringify(event.postback.params)})`
    return client.replyMessage(
      replyToken,
      {
        type: 'text',
        "text": `Got postback: ${textdata}`
      }
    )
  },
  drinkMenu: async ({ replyToken, key, actionMap }) => {
    const resturant = await DRINK.resturantSearch(actionMap[key])
    return client.replyMessage(
      replyToken,
      {
        type: 'image',
        originalContentUrl: resturant.image.menu.url,
        previewImageUrl: resturant.image.menu.url,
      }
    )
  },
  allResturant: async ({ replyToken }) => {
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
  },
  cancelDrinkOrder: async ({ replyToken, key, actionMap, userId }) => {
    let orderId = actionMap[key]
    const myOrder = await DRINK.getOrder(orderId)
    if (myOrder) {
      const drinksOrder = JSON.parse(myOrder.fields.order)
      //`cancelDrinkOrder=${orderId}&drinkIndex=${index}&drink=${drink.drink.drink}`
      if (drinksOrder[actionMap.drinkIndex] && drinksOrder[actionMap.drinkIndex].user === userId) {
        if (drinksOrder[actionMap.drinkIndex].drink.drink === actionMap.drink) {
          drinksOrder.splice(actionMap.drinkIndex, 1)
        }
        console.log(drinksOrder)
        try {
          const result = await DRINK.updateOrder(orderId, drinksOrder)
          console.log(result)
          if (result) {
            return client.replyMessage(
              replyToken,
              {
                "type": "text",
                "text": "成功更改",
              }
            )
          }
        } catch (err) {
          return client.replyMessage(
            replyToken,
            {
              "type": "text",
              "text": "好像更改出了問題！ ",
            }
          )
        }
      }
      return client.replyMessage(
        replyToken,
        {
          "type": "text",
          "text": "好像出了問題！ ",
        })
    }
  },
  updateOrder: async ({ replyToken, key, actionMap, userId }) => {
    let orderId = actionMap[key]
    const myOrder = await DRINK.getOrder(orderId)
    console.log(myOrder)
    if (myOrder) {
      const drinksOrder = JSON.parse(myOrder.fields.hasOwnProperty('order') ? myOrder.fields.order || '[]' : '[]')
      const response = drinksOrder.length > 0 ?
        drinksOrder.map((drink, index) => {
          if (myOrder.fields.owner === userId || drink.user === userId) {
            return {
              "type": "flex",
              "altText": "update drink",
              "contents": {
                "type": "bubble",
                "body": {
                  "type": "box",
                  "layout": "vertical",
                  "spacing": "md",
                  "contents": [
                    {
                      "type": "text",
                      "text": `${drink.drink.drink} (${drink.drink.size === 'large' ? '大' : drink.drink.size === 'medium' ? '中' : ''} ${drink.drink.sugar ? drink.drink.sugar : ''} ${drink.drink.ice ? drink.drink.ice : ''})`,
                      "size": "lg",
                      "wrap": true,
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
                      "contents": [
                        {
                          "type": "button",
                          "style": "link",
                          "height": "sm",
                          "color": "#F6CEF5",
                          "action": {
                            "type": "postback",
                            "label": `刪除`,
                            "data": `cancelDrinkOrder=${orderId}&drinkIndex=${index}&drink=${drink.drink.drink}`
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        })
        : [{
          "type": "text",
          "text": "這團沒有ORDER",
        }]

      return client.replyMessage(
        replyToken,
        response
      )
    }
  },

  startDrinkOrder: async ({ replyToken, key, actionMap, userId }) => {
    const resturant = await DRINK.resturantSearch(actionMap[key])
    const order = await DRINK.createOwnerOrder(userId, resturant)

    if (order) {
      DRINK.startPendingOrder(userId, order.id)
      return client.replyMessage(replyToken,
        [
          {
            "type": "text",
            "text": `你的 ${resturant.name} 團已開!`
          },
          {
            "type": "text",
            "text": `邀人方法:\n1。只要他跟'開DIN' 打入 "跟團號 ${order.id}"\n2。他選完飲料、就會出到同一張單了`
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
  },
  joinGroupOrder: async ({ replyToken, actionMap, userId }) => {
    // const currentUser = await LINE.getProfile(event.source.userId)
    const orderId = actionMap['orderId']
    if (orderId && orderId !== 'undefined') {
      console.log("start sending order")
      // `setDrinkOrder=start&orderId=${pendingOrder[0]}&drink=${x.fields.Name}&size=large&resutrant=id`
      DRINK.startPendingOrder(userId, orderId)
      const order = await DRINK.getOrder(orderId)
      let owner = null
      let created = null

      if (order) {
        if (order.fields.owner) {
          owner = await DRINK.getUser(order.fields.owner)
        }
        if (order.fields.created_time) {
          created = new Date(order.fields.created_time).yyyymmdd()
        }
      }

      return client.replyMessage(
        replyToken,
        [
          {
            "type": "text",
            "text": `你在跟 ${owner ? owner.fields.displayName : ''} ${created ? created : ''} ${actionMap['resturant']} 團`
          },
          {
            "type": "text",
            "text": "請問你要喝什麼? "
          }
        ]
      )
    }
  },
  setDrinkOrder: async ({ replyToken, key, actionMap, userId }) => {
    console.log("start sending order2")
    const orderId = actionMap.orderId
    if (orderId && orderId !== 'undefined') {
      const sugar = {
        '無糖': "#F3E2A9",
        '少糖': "#F7D358",
        '半糖': "#FACC2E",
        '全糖': "#FF8000",
      }
      const icecube = {
        '去冰': "#A9F5F2",
        '微冰': "#2ECCFA",
        '少冰': "#0080FF",
        '正常': "#0174DF",
      }
      const temperature = {
        '溫': "#eaacac",
        '熱': "#ff0000"
      }
      if (actionMap[key] === 'start') {
        return client.replyMessage(
          replyToken,
          [{
            "type": "flex",
            "altText": "Confirm Drink option - sugar",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                  {
                    "type": "text",
                    "text": `${actionMap.drink}`,
                    "wrap": true,
                    "size": "lg"
                  },
                  {
                    "type": "text",
                    "text": "請問甜度：",
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
                    "contents": [
                      ...Object.keys(sugar).map(x => {
                        return {
                          "type": "button",
                          "style": "primary",
                          "color": sugar[x],
                          "action": {
                            "type": "postback",
                            "label": `${x}`,
                            "data": `setDrinkOrder=sugarOption&orderId=${orderId}&drink=${actionMap.drink}&size=${actionMap.size}&sugar=${x}&price=${actionMap.price}&resturant=${actionMap.resturant}`
                          }
                        }
                      })

                    ]
                  }
                ]
              }
            }
          }]
        )
      }

      if (actionMap[key] === 'sugarOption') {
        return client.replyMessage(
          replyToken,
          [{
            "type": "flex",
            "altText": "Confirm Drink option",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                  {
                    "type": "text",
                    "text": `${actionMap.drink}`,
                    "wrap": true,
                    "size": "lg"
                  },
                  {
                    "type": "text",
                    "text": "請問冰塊：",
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
                    "contents": [
                      ...Object.keys(icecube).map(x => {
                        return {
                          "type": "button",
                          "style": "primary",
                          "color": icecube[x],
                          "action": {
                            "type": "postback",
                            "label": `${x}`,
                            "data": `setDrinkOrder=ready&orderId=${orderId}&drink=${actionMap.drink}&size=${actionMap.size}&sugar=${actionMap.sugar}&ice=${x}&price=${actionMap.price}&resturant=${actionMap.resturant}`
                          }
                        }
                      }),
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "horizontal",
                    "spacing": "sm",
                    "contents": [
                      ...Object.keys(temperature).map(x => {
                        return {
                          "type": "button",
                          "style": "primary",
                          "color": temperature[x],
                          "action": {
                            "type": "postback",
                            "label": `${x}`,
                            "data": `setDrinkOrder=ready&orderId=${orderId}&drink=${actionMap.drink}&size=${actionMap.size}&sugar=${actionMap.sugar}&ice=${x}&price=${actionMap.price}&resturant=${actionMap.resturant}`
                          }
                        }
                      })
                    ]
                  }
                ]
              }
            }
          }]
        )
      }

      if (actionMap[key] === 'ready') {
        console.log("start sending order")
        // `setDrinkOrder=start&orderId=${pendingOrder[0]}&drink=${x.fields.Name}&size=large&resutrant=id`
        await DRINK.sendOrder(userId, orderId, {
          drink: actionMap['drink'],
          size: actionMap['size'],
          sugar: actionMap['sugar'],
          ice: actionMap['ice'],
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
              "text": `${actionMap['drink']}(${actionMap['size'] === 'large' ? '大' : '中'} ${actionMap['sugar']} ${actionMap['ice']})`
            },
            {
              "type": "text",
              "text": "如要檢查結果:"
            },
            {
              "type": "flex",
              "altText": "group order success",
              "contents": {
                "type": "bubble",
                "footer": {
                  "type": "box",
                  "layout": "vertical",
                  "spacing": "sm",
                  "contents": [
                    {
                      "type": "button",
                      "style": "primary",
                      "action": {
                        "type": "message",
                        "label": `團號 ${orderId}`,
                        "text": `團號 ${orderId}`
                      }
                    }
                  ]
                }
              }
            }
          ]
        )
      }
    } else { // ask for 開團
      const resturant = await DRINK.resturantSearch(actionMap['resturant'])
      return client.replyMessage(
        replyToken,
        [
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
          },
          {
            "type": "text",
            "text": `你要開團嗎？（如要請點開團）`
          },
        ]
      )
    }
  }

}

const textHandler = {
  track_order: async ({ replyToken, featureKey, userId }) => {
    try {
      const order = await DRINK.getOrder(featureKey[1])
      if (order) {
        const owner = await DRINK.getUser(order.fields.owner)
        const resturant = await DRINK.resturantSearch(order.fields.restaurant_index[0])
        const allOrders = JSON.parse(order.fields.order || "[]")
        const isOwner = userId === order.fields.owner
        const total = allOrders.length > 0 ? allOrders.map((x) => parseInt(x.drink.price)).reduce((accu, cur) => accu + parseInt(cur)) : 0

        const groupInfo = isOwner ? DRINK.orderInfoLineBlock(allOrders) : DRINK.orderInfoLineBlock(allOrders.filter(x => x.user === userId))
        const groupContainer = groupInfo.length > 0 ?
          {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": groupInfo
          } : {
            "type": "text",
            "text": `無人下單`,
            "size": "sm"
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
                    "text": `團單 `,
                    "color": "#00db94",
                    "weight": "bold"
                  },
                  {
                    "type": "text",
                    "text": `${resturant.name}`,
                    "weight": "bold",
                    "size": "xl",
                    "margin": "md",
                  },
                  {
                    "type": "text",
                    "text": `${owner.fields.displayName} - ${featureKey[1]}`,
                    "margin": "xs",
                    "color": "#aaaaaa",
                    "wrap": true
                  },
                  {
                    "type": "text",
                    "text": `${new Date(order.createdTime).yyyymmdd()}`,
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
                      "label": "更改訂單",
                      "data": `updateOrder=${order.id}`
                    }
                  },
                  {
                    "type": "button",
                    "style": "primary",
                    "action": {
                      "type": "postback",
                      "label": "跟團/下單",
                      "data": `joinGroupOrder=true&orderId=${order.id}&resturant=${resturant.name}`
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
      return client.replyMessage(
        replyToken,
        {
          type: 'text',
          text: `找不到 團號 ${featureKey[1]}`
        }
      )
    }
  },
  my_order: async ({ replyToken, userId }) => {
    const myOrders = await DRINK.getMyOrder(userId)
    const response = myOrders.length > 0 ?
      myOrders.map(order => {
        return {
          "type": "button",
          "style": "primary",
          "height": "sm",
          "action": {
            "type": "message",
            "label": `${new Date(order.fields.created_time).daytime()}\t${order.id}`,
            "text": `團號 ${order.id}`
          }
        }
      }) :
      [{
        "type": "text",
        "text": "你還沒有開團",
      }]
    return client.replyMessage(
      replyToken,
      {
        "type": "flex",
        "altText": `我的團`,
        "contents": {
          "type": "bubble",
          "footer": {
            "type": "box",
            "layout": "vertical",
            "contents": response
          }
        }
      }
    )
  },
  confirm_new_word: ({ replyToken }) => {
    return client.replyMessage(
      replyToken,
      {
        type: 'text',
        text: `好的，謝謝你教我新字。 \n過一陣子 ～～～ 我會記起來～`
      }
    )
  },
  start_drink_order: async ({ replyToken, intent }) => {
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
  },
  drink_resturant: async ({ replyToken, intent }) => {
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
  },
  menu: ({ replyToken }) => {
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
                "color": "#ff0100",
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
                  "type": "message",
                  "label": "crypto currency",
                  "text": "crypto"
                }
              },
              {
                "type": "button",
                "style": "primary",
                "color": "#F5CC4F",
                "action": {
                  "type": "message",
                  "label": "把·開din·傳出去！",
                  "text": "share"
                }
                // },
                // {
                //   "type": "button",
                //   "style": "primary",
                //   "action": {
                //     "type": "message",
                //     "label": "開團",
                //     "text": "開團"
                //   }
              },
              {
                "type": "button",
                "style": "link",
                "action": {
                  "type": "message",
                  "label": "我的團",
                  "text": "myorder"
                }
              },
              {
                "type": "button",
                "style": "link",
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
                  "type": "postback",
                  "label": "所有飲料店",
                  "data": "allResturant=true"
                }
              }
            ]
          }
        }
      }
    )
  },

  drink_name: async ({ replyToken, intent, userId, witIntent }) => {
    const pendingOrder = DRINK.hasPendingOrder(userId)
    let pendingMsg = undefined
    let resturant = []

    const restName = intent.key.replace('drink_name_', '')
    resturant = await DRINK.resturantSearch(restName)

    if (dd) console.log(resturant)
    let drinks = (await DRINK.searchDrink(resturant.index, intent.value)).slice(0, 3).map(x => {
      return {
        ...x,
        resturant: resturant
      }
    }).reverse()

    if (pendingOrder && pendingOrder[0]) {
      const pendingOrderObject = await DRINK.getOrder(pendingOrder[0])
      if (pendingOrderObject.fields.restaurant_index[0] !== resturant.id) {
        resturant = await DRINK.resturantSearch(pendingOrderObject.fields.restaurant_index[0])
        pendingMsg = {
          type: 'text', text: `我也找到有些飲料跟團不一樣的店哦! 請確定 ${resturant.name} 有 '${witIntent._text}'～`
        }
        drinks = [
          ...drinks,
          ...(await DRINK.searchDrink(resturant.index, witIntent._text)).slice(0, 3).map(x => {
            return {
              ...x,
              resturant: resturant
            }
          }).reverse()
        ]
      }
    } else {
      pendingMsg = { type: 'text', text: "可是你還沒開團/跟團\n 打入 \"myorder\" 或 飲料店名稱點開團 " }
    }
    if (drinks.length >= 5) {
      drinks = drinks.slice(-4)
    }

    // drinks = drinks.reverse()

    // if (pendingOrder && pendingOrder[0]) {
    //   const pendingOrderObject = await DRINK.getOrder(pendingOrder[0])
    //   if (dd) console.log(pendingOrderObject)
    //   if (dd) console.log(")))))")
    //   if (pendingOrderObject) {
    //     if (pendingOrderObject.fields.restaurant_index[0] !== resturant.id) {
    //       pendingMsg = {
    //         type: 'text', text: `找到的 飲料 跟 開團的不一樣哦! 請確定這家有 '${intent.value}'`
    //       }
    //     }
    //   }
    // } else {
    //   pendingMsg = { type: 'text', text: "可是你還沒開團/跟團" }
    // }
    // console.log(pendingOrder)
    const drinkButtons = drinks.map((x, index) => {
      const result = []
      const medium = x.fields.medium ?
        {
          "type": "button",
          "style": "primary",
          ... (index === drinks.length - 1 ? null : { color: "#905c44" }),
          "action": {
            "type": "postback",
            "label": `中 $${x.fields.medium} `,
            "data": `setDrinkOrder=start&orderId=${pendingOrder[0]}&drink=${x.fields.Name}&size=medium&price=${x.fields.medium}&resturant=${x.resturant.index}`
          }
        }
        : null

      const large = x.fields.large ?
        {
          "type": "button",
          "style": "primary",
          ... (index === drinks.length - 1 ? null : { color: "#905c44" }),
          "action": {
            "type": "postback",
            "label": `大 $${x.fields.large} `,
            "data": `setDrinkOrder=start&orderId=${pendingOrder[0]}&drink=${x.fields.Name}&size=large&price=${x.fields.large}&resturant=${x.resturant.index}`
          }
        }
        : null
      if (medium) result.push(medium)
      if (large) result.push(large)
      return result
    })
    if (dd) console.log(drinks)
    if (dd) console.log(drinkButtons)
    const messages = [
      ...drinks.map((x, index) => {
        if (x) {
          // console.log(x)
          // console.log('000000')
          return DRINK.drinkLineBlock(x, drinkButtons[index])
        }
        return
      })
    ]
    if (pendingMsg) {
      messages.push(pendingMsg)
    }
    return client.replyMessage(replyToken, messages)
  }
}

const LINEAction = {
  postback,
  textHandler
}
module.exports = LINEAction
