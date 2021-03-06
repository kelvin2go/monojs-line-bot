const { getWeather } = require('./weather.controller.js')

module.exports = [
	{
		method: 'GET',
		path: '/weather',
		async handler(req, res) {
			const weatherInfo = await getWeather()
			res.json({ weatherInfo })
		},
	},
	{
		method: 'GET',
		path: '/weather/send',
		async handler(req, res) {
			const weatherInfo = await getWeather()
			res.json({ weatherInfo })
		},
	}
]
