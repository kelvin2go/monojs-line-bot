const line = require('./line.controller.js')


module.exports = [
	{
		method: ['POST', 'GET'],
		path: '/callback',
		handler: [
      // line.middleware(),
      async (req, res) => {
        Promise
        .all(req.body.events.map(line.handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
          console.error(err);
          res.status(500).end();
        });
		}]
	}
]
