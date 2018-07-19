// https://github.com/avajs/ava#assertions
const test = require('ava')

const { join } = require('path')
const { start, stop, $get } = require('mono-test-utils')

let monoContext
const context = {}

/*
** Start API
*/
test.before('Start API', async () => {
	// Start the API with NODE_ENV=test
	// See https://github.com/terrajs/mono-test-utils#start-a-mono-project-from-dir-directory-with-node_envtest
	monoContext = await start(join(__dirname, '..'))
})

/*
** modules/hello/
*/
// GET /hello
test('GET /hello => 200', async (t) => {
	const { statusCode, body } = await $get('/hello')

	t.is(statusCode, 200)
	t.deepEqual(body, { hello: 'world' })
})

/*
** Stop API
*/
test.after('Stop server', async () => {
	await stop(monoContext.server)
})
