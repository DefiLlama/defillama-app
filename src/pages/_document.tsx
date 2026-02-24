import { Head, Html, Main, NextScript } from 'next/document'

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
				<link href="/src/tailwind.css" rel="stylesheet" />
				<link href="/src/nprogress.css" rel="stylesheet" />
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								const VALID_THEME_VALUES = ['dark', 'light'];
								
								function sanitizeThemeValue(value) {
									if (!value) return 'dark';
									const trimmed = String(value).trim();
									return VALID_THEME_VALUES.includes(trimmed) ? trimmed : 'dark';
								}
								
								function parseThemeCookie(cookieString) {
									if (!cookieString) return 'dark';
									
									const cookies = cookieString.split(';');
									const themeCookie = cookies.find(cookie => cookie.trim().startsWith('defillama-theme='));
									
									if (themeCookie) {
										const parts = themeCookie.split('=');
										if (parts.length >= 2 && parts[1]) {
											return sanitizeThemeValue(parts[1]);
										}
									}
									
									return 'dark';
								}
								
								const isDarkMode = parseThemeCookie(document.cookie) === 'dark';
								
								if (!isDarkMode) {
									document.documentElement.classList.remove('dark');
									document.documentElement.classList.add('light');
								} else {
									document.documentElement.classList.remove('light');
									document.documentElement.classList.add('dark');
								}
							})();
						`
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
