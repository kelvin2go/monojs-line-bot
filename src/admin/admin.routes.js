const CRON = require('../lib/cron.js')

module.exports = [
	{
		method: ['GET', 'POST'],
		path: '/admin/start',
		handler(req, res) {
			CRON.start()
			res.json({ ok: 'success' })
		}
  },
  {
    method: ['GET', 'POST'],
    path: '/admin/stop',
    handler(req, res) {
      CRON.stop()
      res.json({ ok: 'success' })
    }
  }
]
