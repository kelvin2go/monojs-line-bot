'use-strict';
const ytsearch = require('youtube-search')

const OPTIONS = {
  maxResults: 5,
  key: process.env.YOUTUBE_KEY,
  order: 'viewCount',
  type: 'video'
}

const YOUTUBE = {
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
