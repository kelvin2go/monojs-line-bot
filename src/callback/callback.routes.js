const line = require('../line/line.controller.js')

module.exports = [
  {
    method: ['POST', 'GET'],
    path: '/callback',
    handler: [
      async (req, res) => {
        // if (req.body.events)
        console.log(req.body.events)
        // res.status(200).end();

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
