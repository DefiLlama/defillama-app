import { Head, Html, Main, NextScript } from 'next/document'
import { ANNOUNCEMENT_DISMISSALS_COOKIE_NAME } from '~/utils/cookies'

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
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								function getCookieValue(cookieString, cookieName) {
									if (!cookieString) return null;
									var cookies = cookieString.split(';');
									var matchingCookie = cookies.find(function(cookie) {
										return cookie.trim().startsWith(cookieName + '=');
									});
									if (!matchingCookie) return null;
									var parts = matchingCookie.split('=');
									if (parts.length < 2 || !parts[1]) return null;
									return parts.slice(1).join('=');
								}

								var cookieValue = getCookieValue(document.cookie, '${ANNOUNCEMENT_DISMISSALS_COOKIE_NAME}');
								if (!cookieValue) return;

								var tokens;
								try {
									tokens = decodeURIComponent(cookieValue).split(',');
								} catch (_error) {
									tokens = cookieValue.split(',');
								}

								var selectors = tokens
									.map(function(token) {
										var normalizedToken = token.trim();
										if (!/^[a-z0-9-]+(?:--[a-z0-9-]+)?$/.test(normalizedToken)) return '';
										return '.announcement-token--' + normalizedToken + '{display:none!important;}';
									})
									.filter(Boolean)
									.join('');

								if (!selectors) return;

								var style = document.createElement('style');
								style.setAttribute('data-announcement-dismissals', 'true');
								style.textContent = selectors;
								document.head.appendChild(style);
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
