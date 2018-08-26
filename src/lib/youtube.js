'use-strict';
const ytsearch = require('youtube-search')

const OPTIONS = {
  maxResults: 5,
  key: process.env.YOUTUBE_KEY,
  order: 'viewCount',
  type: 'video'
}

const YOUTUBE = {
  toString: (results) => {
    let msg = Object.keys(results).map( (key) => {
      const x = results[key]
      let result = `\n${x.title}: `
      if ('link' in x) {
        result += ` \n${x.link}`
      }
      console.dir(x.thumbnails)
      if ('thumbnails' in x) {
        console.dir(x.thumbnails)
      }
      return result
    })
    console.log(msg)
    return msg
  },
  search: async (title) => {
    let result = await ytsearch(title, OPTIONS)
    return result.results
  },
  getTop5: async () => {        
    let result = await ytsearch('', OPTIONS, (err, results) => {
      return results.data
    })
    return result.data
  },
}

module.exports = YOUTUBE
