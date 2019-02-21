'use-strict';
const WEATHER = require('../weather/weather.controller')
// const LINE = require('../line/line.controller')
// const FIREBASE = require('./firebase')

let cache = {
  weather: null
}
let timer = {}

const CRON = {
  start: () => {
    timer.weather = setInterval(CRON.weather, 4000)
  },
  stop: () => {
    Object.keys(timer).map((key) => {
      clearInterval(timer[key])
      console.log(`Stop: ${key}`)
    })
  },
  weather: async () => {
    const weatherInfo = await WEATHER.getWeather()
    if (JSON.stringify(cache.weather) !== JSON.stringify(weatherInfo)) {
      cache.weather = weatherInfo
      // start sending push weather message 
      // const allusers = await FIREBASE.getAllUser()
      // const userIds = []
      // allusers.forEach(doc => {
      //   userIds.push(doc.data().userId)
      // });
      // const weatherStr = WEATHER.toString(weatherInfo)
      // LINE.multicast(userIds, [
      //   `天氣注意:\n${weatherStr.warning}`,
      //   `最近地震:\n${weatherStr.earthquake}`
      // ])
    }
  },

}

module.exports = CRON
