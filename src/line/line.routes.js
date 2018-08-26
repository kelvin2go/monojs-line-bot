const LINE = require('./line.controller.js')
const FIREBASE = require('../lib/firebase')

module.exports = [
	{
		method: ['GET', 'POST'],
		path: '/line/send/:userid/:msg',
		async handler(req, res) {
			let profile = await FIREBASE.getUser(req.params.userid)
			console.log(profile.data())
      LINE.pushMessage(profile.data(), req.params.msg)
			res.json({ ok: 'success' })
		}
	}
]
