import * as React from 'react'
import { ThemeProvider as StyledComponentsThemeProvider, createGlobalStyle, keyframes } from 'styled-components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { sm, med, lg, xl, twoXl } from '~/constants/breakpoints'

export default function ThemeProvider({ children }) {
	const [darkMode] = useDarkModeManager()

	return <StyledComponentsThemeProvider theme={theme(darkMode)}>{children}</StyledComponentsThemeProvider>
}

const theme = (darkMode) => ({
	mode: darkMode ? 'dark' : 'light',

	text1: darkMode ? '#FAFAFA' : '#1F1F1F',
	text2: darkMode ? '#C3C5CB' : '#565A69',
	text3: darkMode ? '#6C7284' : '#888D9B',
	text4: darkMode ? '#565A69' : '#C3C5CB',
	text5: darkMode ? '#2C2F36' : '#EDEEF2',

	// special case text types
	white: '#FFFFFF',

	// backgrounds / greys
	bg1: darkMode ? '#212429' : '#FAFAFA',
	bg2: darkMode ? '#2C2F36' : '#F7F8FA',
	bg3: darkMode ? '#40444F' : '#EDEEF2',
	bg4: darkMode ? '#565A69' : '#CED0D9',
	bg5: darkMode ? '#565A69' : '#888D9B',
	bg6: darkMode ? '#000' : '#FFFFFF',
	bg7: darkMode ? 'rgba(7,14,15,0.7)' : 'rgba(252,252,251,1)',

	//specialty colors
	background: darkMode ? '#17181c' : '#ffffff',
	advancedBG: darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
	divider: darkMode ? 'rgba(43, 43, 43, 0.435)' : 'rgba(43, 43, 43, 0.035)',

	//primary colors
	primary1: darkMode ? '#2172E5' : '#445ed0',

	// other
	red1: '#FF6871',
	green1: '#27AE60',
	link: '#2172E5',
	blue: '#2f80ed',

	//shadow
	shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
	shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
	shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
	shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

	// breakpoints
	bpSm: `${sm}rem`,
	bpMed: `${med}rem`,
	bpLg: `${lg}rem`,
	bpXl: `${xl}rem`,
	bp2Xl: `${twoXl}rem`,

	maxSm: `@media screen and (max-width: ${sm}rem)`,
	maxMed: `@media screen and (max-width: ${med}rem)`,
	maxLg: `@media screen and (max-width: ${lg}rem)`,
	maxXl: `@media screen and (max-width: ${xl}rem)`,

	minSm: `@media screen and (min-width: ${sm}rem)`,
	minMed: `@media screen and (min-width: ${med}rem)`,
	minLg: `@media screen and (min-width: ${lg}rem)`,
	minXl: `@media screen and (min-width: ${xl}rem)`,
	min2Xl: `@media screen and (min-width: ${twoXl}rem)`,

	breakpoints: [`${sm}rem`, `${med}rem`, `${lg}rem`, `${xl}rem`]
})

const slideUp = keyframes`
	0% {
		opacity: 0;
	transform: translateY(100%);
	}

	100% {
		transform: translateY(0%);
		opacity: 1;
	}
`

export const GlobalStyle = createGlobalStyle`
	.sliding-menu-item {
		flex-shrink: 0;
		padding: 8px;
		color: ${({ theme }) => theme.text1};
		cursor: pointer;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		background: none;
		border: none;
		text-align: start;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;

		& > *[data-name] {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};

		@media screen and (min-width: 640px) {
			

			:hover,
			:focus-visible,
			&[data-active-item] {
				outline: none;

				&[data-variant='secondary'] {
					background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
				}
			}
		}
	}

	.sliding-menu {
		display: flex;
		flex-direction: column;
		gap: 8px;
		height: 70vh;
		min-width: 180px;
		font-size: 0.875rem;
		font-weight: 500;
		color: ${({ theme }) => theme.text1};
		background: ${({ theme }) => theme.bg1};
		border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
		border-radius: 8px 8px 0 0;
		filter: ${({ theme }) =>
			theme.mode === 'dark'
				? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
				: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
		overflow-y: auto;
		outline: none !important;
		z-index: 10;
		padding: 8px;


		&[data-variant='secondary'] {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
		}

		&[data-menuwrapper='true'] {
			overflow-x: scroll;
			overscroll-behavior: contain;
			scroll-behavior: smooth;
			scroll-snap-type: x mandatory;
			scroll-snap-stop: always;
			scrollbar-width: none;
			animation: ${slideUp} 0.2s ease;
			z-index: 10;

			::-webkit-scrollbar {
				display: none;
			}
		}

		&[data-leave] {
			z-index: 0;
		}

		@media screen and (min-width: 640px) {
			max-height: 400px;
			font-size: 0.825rem;
			font-weight: 400;
			gap: 0px;
			background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
			border-radius: 8px;
			transform: translateY(0%);

			&[data-variant='secondary'] {
				background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
			}
		}
	}

	.sliding-menu-button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 8px 12px;
		font-size: 0.825rem;
		border-radius: 8px;
		cursor: pointer;
		outline: none;
		border: 1px solid transparent;
		color: ${({ theme }) => theme.text1};

		white-space: nowrap;

		:focus-visible {
			outline: ${({ theme }) => '1px solid ' + theme.text1};
			outline-offset: 1px;
		}

		span:first-of-type {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		svg {
			position: relative;
			top: 1px;
		}

		&[data-variant='secondary'] {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
			font-size: 0.75rem;

			:hover,
			:focus-visible,
			&[data-focus-visible] {
				background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
			}
		}
	}

	.sliding-menu-button.no-bg {
		background: none;
	}

	.sliding-menu-button.align-reverse {
		flex-direction: row-reverse;
	}

`
