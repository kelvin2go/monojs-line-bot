'use strict';
const line = require('@line/bot-sdk')
const cachios = require('cachios')
const Fuse = require('fuse.js')

const API_URL = `https://api.airtable.com/v0/${process.env.AIR_TABLE_API_DRINK}`
const config = {
  headers: {
    Authorization: `Bearer ${process.env.AIR_TABLE_API_TOKEN}`
  }
}
const postconfig = {
  ...config,
  headers: {
    ...config.headers,
    "Content-Type": "application/json"
  }
}

const LINEConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const LINEClient = new line.Client(LINEConfig)

const fuseOptions = {
  shouldSort: true,

  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    "id",
    "fields.Name",
    "fields.index"
  ]
}

const DRINK = {
  resturantList: [],
  pendingOrder: [],
  initOrderUsers: [],
  userList: [],
  resturantSearch: async (text, toObject = true) => {
    let list = DRINK.resturantList
    if (list.length <= 0) {
      list = await DRINK.getIndex()
    }
    console.log(`Search resturant ${text}`)
    // console.log(list)
    const fuse = new Fuse(list, fuseOptions)
    const result = fuse.search(text)
    if (result.length > 0 && toObject) {
      const resturant = DRINK.resturantObject(result)
      return resturant
    }
    return result
  },
  getIndex: async () => {
    console.log('Getting index data from Airtable')
    const data = await cachios.get(`${API_URL}/index?view=Grid%20view`, config)
    // console.log(data.data)
    DRINK.resturantList = data.data.records.filter(x => {
      return x.fields.online
    })
    return DRINK.resturantList
  },
  resturantObject: (drinkResutrant) => {
    let resturant = []
    if (drinkResutrant) {
      resturant = {
        id: drinkResutrant[0].id,
        index: drinkResutrant[0].fields.index,
        name: drinkResutrant[0].fields.Name,
        intro: drinkResutrant[0].fields.intro,
        url: drinkResutrant[0].fields.link,
        image: {
          logo: drinkResutrant[0].fields.logo[0],
          menu: drinkResutrant[0].fields.menu[0]
        }
      }
    }
    return resturant
  },
  getUser: async (userId) => {
    console.log(`Getting users ${userId} data from Airtable`)
    const data = await cachios.get(`${API_URL}/users?view=Grid%20view`, config)
    const userOption = {
      ...fuseOptions,
      keys: [
        "fields.userId"
      ]
    }
    const fuse = new Fuse(data.data.records, userOption)
    const result = fuse.search(userId)
    if (result.length > 0) {
      // console.log(result)
      return result[0]
    }
    return false
  },
  addUser: async (userId) => {
    let foundUser = null
    if (userId) {
      foundUser = await DRINK.getUser(userId)
    }
    if (foundUser) return // already added
    const profile = await LINEClient.getProfile(userId)
    const fields = {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      avatar: [{ url: profile.pictureUrl }],
      profile: JSON.stringify(profile)
    }
    let result = {}
    try {
      result = await cachios.post(`${API_URL}/users`, { fields }, postconfig)
      result = result.data
    } catch (err) {
      console.log(err)
    }
    return result
  },
  createOwnerOrder: async (ownerId, resturant) => {
    const fields = {
      owner: ownerId,
      restaurant_index: [resturant.id]
    }
    const ownerProfile = await DRINK.getUser(ownerId)
    if (!ownerProfile) {
      await DRINK.addUser(ownerId)
    }
    let result = {}
    try {
      result = await cachios.post(`${API_URL}/orders`, { fields }, postconfig)
      result = result.data
    } catch (err) {
      console.log(err)
    }
    return result
  },
  getResturantDrinks: async (resturantIndex) => {
    console.log(`Getting  drinks from Airtable ${resturantIndex}`)
    const data = await cachios.get(`${API_URL}/${resturantIndex}?view=Grid%20view`, config)
    // const values = data.data.records.map(x => {
    //   return { value: x.fields.Name, expressions: [x.fields.Name] }
    // })
    // console.log(values)
    return data.data.records
  },
  searchDrink: async (resturantIndex, drinkName) => {
    const drinkList = await DRINK.getResturantDrinks(resturantIndex)
    const drinkOption = {
      ...fuseOptions,
      keys: [
        "fields.Name"
      ]
    }
    // console.log(drinkOption)
    const fuse = new Fuse(drinkList, drinkOption)
    const result = fuse.search(drinkName)
    // console.log('---')
    // console.log(result)
    return result
  },
  getOrder: async (orderId) => {
    const data = await cachios.get(`${API_URL}/orders/${orderId}`, {
      ...config,
      ttl: 5
    })
    return data.data
  },
  getMyOrder: async (userId) => {
    const data = await cachios.get(`${API_URL}/orders?view=Grid%20view`, {
      ...config,
      ttl: 3
    })
    const myorder = data.data.records.filter(x => {
      if (x.fields.owner === userId) {
        return x
      }
    })
    return myorder
  },
  sendOrder: async (userId, orderId, drinkObj) => {
    if (!orderId) console.log("no orderId on sendOrder")
    const order = await DRINK.getOrder(orderId)
    let profile = await DRINK.getUser(userId)
    if (!profile) {
      profile = await LINEClient.getProfile(userId)
    }
    // console.log(profile)
    const fields = {
      order: JSON.stringify([
        ...JSON.parse(order.fields.order || "[]"),
        {
          user: userId,
          username: profile.fields.displayName,
          drink: drinkObj,
          timestamp: new Date(),
        }])
    }
    let result = {}
    try {
      result = await cachios.patch(`${API_URL}/orders/${orderId}`, { fields }, postconfig)
      result = result.data
    } catch (err) {
      console.log(err)
    }
    return result
  },
  updateOrder: async (orderId, drinkOrders) => {
    if (!orderId) console.log("no orderId on sendOrder")
    let result = {}
    const fields = {
      order: JSON.stringify(drinkOrders || "[]"),
    }
    try {
      result = await cachios.patch(`${API_URL}/orders/${orderId}`, { fields }, postconfig)
      result = result.data
    } catch (err) {
      console.log(err)
    }
    return result
  },
  clearPendingOrder: (userId) => {
    delete DRINK.pendingOrder[userId]
  },
  startPendingOrder: (userId, orderId) => {
    DRINK.pendingOrder = {
      ...DRINK.pendingOrder,
      [userId]: [
        orderId,
        ...[DRINK.pendingOrder.hasOwnProperty(userId) ? DRINK.pendingOrder[userId] : null],
      ]
    }
    // console.log(DRINK.pendingOrder)
    return DRINK.pendingOrder
  },
  hasPendingOrder: (userId) => {
    // console.log(DRINK.pendingOrder.hasOwnProperty(userId) ? DRINK.pendingOrder[userId] : false)
    return DRINK.pendingOrder.hasOwnProperty(userId) ? DRINK.pendingOrder[userId] : false
  }

}

module.exports = DRINK
