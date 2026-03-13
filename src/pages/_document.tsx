import { Head, Html, Main, NextScript } from 'next/document'
import { getAnnouncementDismissalBootstrapScript, getThemeBootstrapScript } from '~/utils/cookies'

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<link rel="dns-prefetch" href="https://tasty.defillama.com" />

				<link rel="icon" href="/favicon.ico" />
				<link rel="icon" href="/icons/favicon-32x32.png" />
				<link rel="icon" href="/icons/favicon-16x16.png" />
				<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
				<link rel="manifest" href="/manifest.json" />
				<link href="/fonts/inter.woff2" rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" />
				<link href="/fonts/jetbrains.ttf" rel="preload" as="font" type="font/ttf" crossOrigin="anonymous" />
				<link href="/icons/v34.svg" rel="prefetch" as="image" type="image/svg+xml" crossOrigin="anonymous" />
				<link href="/assets/defillama.webp" rel="preload" as="image" type="image/webp" />
				<script
					dangerouslySetInnerHTML={{
						__html: getThemeBootstrapScript()
					}}
				/>
				<script
					dangerouslySetInnerHTML={{
						__html: getAnnouncementDismissalBootstrapScript()
					}}
				/>
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
