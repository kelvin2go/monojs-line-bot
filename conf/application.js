/*
** This is your application configuration
** See https://terrajs.org/mono/configuration
*/

module.exports = {
	mono: {
		// See https://terrajs.org/mono/configuration/modules
		modules: [
			'mono-doc',
		],
		// See https://terrajs.org/mono/configuration/http
		http: {
			port: process.env.PORT || 8000,
			logLevel: 'combined'
		},
		// See https://terrajs.org/mono/configuration/log
		log: {
			level: 'verbose'
		}
	}
}
