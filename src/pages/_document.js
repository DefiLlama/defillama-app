import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
	return (
		<Html lang="en" className="dark">
			<Head>
				<link href="/fonts/inter.woff2" rel="preload" as="font" crossOrigin="anonymous" />
				<link href="/fonts/jetbrains.ttf" rel="preload" as="font" crossOrigin="anonymous" />
				<link href="/icons/v4.svg" rel="prefetch" as="image" type="image/svg+xml" crossOrigin="anonymous" />
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#445ed0" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="DeFiLlama" />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
