import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<link href="/fonts/inter.woff2" rel="preload" as="font" crossOrigin="anonymous" />
				<link href="/fonts/jetbrains.ttf" rel="preload" as="font" crossOrigin="anonymous" />
				<link href="/icons/v5.svg" rel="prefetch" as="image" type="image/svg+xml" crossOrigin="anonymous" />
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								function parseThemeCookie(cookieString) {
									if (!cookieString) return 'true';
									
									const cookies = cookieString.split(';');
									const themeCookie = cookies.find(cookie => cookie.trim().startsWith('defillama-theme='));
									
									if (themeCookie) {
										return themeCookie.split('=')[1] || 'true';
									}
									
									return 'true';
								}
								
								const isDarkMode = parseThemeCookie(document.cookie) === 'true';
								
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
