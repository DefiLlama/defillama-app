import Document, { Html, Head, Main, NextScript } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

class MyDocument extends Document {
	static async getInitialProps(ctx) {
		const sheet = new ServerStyleSheet()
		const originalRenderPage = ctx.renderPage

		try {
			ctx.renderPage = () =>
				originalRenderPage({
					enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />)
				})

			const initialProps = await Document.getInitialProps(ctx)

			return {
				...initialProps,
				styles: [initialProps.styles, sheet.getStyleElement()]
			}
		} finally {
			sheet.seal()
		}
	}

	render() {
		return (
			<Html lang="en" className="dark">
				<Head>
					<link href="/fonts/inter.woff2" rel="preload" as="font" crossorigin="anonymous" />
					<link href="/fonts/jetbrains.ttf" rel="preload" as="font" crossorigin="anonymous" />
					<link href="/icons.svg" rel="preload" as="image" type="image/svg+xml" crossorigin="anonymous" />
					<link href="/defillama-press-kit/defi/PNG/defillama.png" rel="preload" as="image" crossorigin="anonymous" />
					<link
						href="/defillama-press-kit/defi/PNG/defillama-dark.png"
						rel="preload"
						as="image"
						crossorigin="anonymous"
					/>
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		)
	}
}

export default MyDocument
