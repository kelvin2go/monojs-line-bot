const cachios = require('cachios')

const API_URL = `https://api.wit.ai`
const config = {
  headers: {
    Authorization: `Bearer ${process.env.WIT_AI_TOKEN}`
  }
}

const WITAI = {
  getIntent: async (text) => {
    const data = await cachios.get(`${API_URL}/message?q=${encodeURIComponent(text)}`, config)
    return data.data
  }
}

module.exports = WITAI
