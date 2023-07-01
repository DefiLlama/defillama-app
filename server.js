const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const hostname = 'localhost'
const port = 3000
// when using middleware `hostname` and `port` must be provided below
const app = next({ hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
	createServer(async (req, res) => {
		try {
			const start = Date.now()
			// Be sure to pass `true` as the second argument to `url.parse`.
			// This tells it to parse the query portion of the URL.
			const parsedUrl = parse(req.url, true)
			const fullUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${
				req.headers['x-forwarded-host'] || req.headers.host
			}${req.url}`

			try {
				await handle(req, res, parsedUrl)
				const duration = Date.now() - start
				const statusCode = res.statusCode
				console.log(`[${statusCode}] [${req.method}] [${duration}ms] ${fullUrl}`)
			} catch (err) {
				const duration = Date.now() - start
				const statusCode = res.statusCode || 500
				console.error(`[${statusCode}] [${req.method}] [${duration}ms] ${fullUrl}`)
			}
		} catch (err) {
			console.error('Error occurred handling', req.url, err)
			res.statusCode = 500
			res.end('internal server error')
		}
	})
		.once('error', (err) => {
			console.error(err)
			process.exit(1)
		})
		.listen(port, () => {
			console.log(`> Ready on http://${hostname}:${port}`)
		})
})
