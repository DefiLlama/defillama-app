import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
	return (
		<Html lang="en" className="dark">
			<Head>
				<link href="/fonts/inter.woff2" rel="preload" as="font" crossOrigin="anonymous" />
				<link href="/fonts/jetbrains.ttf" rel="preload" as="font" crossOrigin="anonymous" />
				<link href="/icons.svg" rel="preload" as="image" type="image/svg+xml" crossOrigin="anonymous" />
				<link href="/defillama-press-kit/defi/PNG/defillama.png" rel="preload" as="image" crossOrigin="anonymous" />
				<link
					href="/defillama-press-kit/defi/PNG/defillama-dark.png"
					rel="preload"
					as="image"
					crossOrigin="anonymous"
				/>
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
