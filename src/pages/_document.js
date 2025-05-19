import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
	return (
		<Html lang="en" className="dark">
			<Head>
				<link href="/fonts/inter.woff2" rel="preload" as="font" type="font" crossOrigin="anonymous" />
				<link href="/fonts/jetbrains.ttf" rel="preload" as="font" type="font" crossOrigin="anonymous" />
				<link href="/icons/v1.svg" rel="prefetch" as="image" type="image/svg+xml" crossOrigin="anonymous" />
				<script crossOrigin="anonymous" src="https://unpkg.com/react-scan/dist/auto.global.js" />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
