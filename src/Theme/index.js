import * as React from 'react'
import styled, { ThemeProvider as StyledComponentsThemeProvider, createGlobalStyle } from 'styled-components'
import { Text } from 'rebass'
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
	background: darkMode ? '#22242A' : '#ffffff',
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

const TextWrapper = styled(Text)`
	color: ${({ color, theme }) => theme[color]};
`

export const TYPE = {
	heading(props) {
		return <TextWrapper fontWeight={500} fontSize={16} color={'text1'} {...props} />
	},

	main(props) {
		return <TextWrapper fontWeight={500} fontSize={14} color={'text1'} {...props} />
	},

	body(props) {
		return <TextWrapper fontWeight={400} fontSize={14} color={'text1'} {...props} />
	},

	largeHeader(props) {
		return <TextWrapper fontWeight={500} color={'text1'} fontSize={24} {...props} />
	}
}

export const Header = styled.h1`
	color: ${({ theme }) => theme['text1']};
	font-size: 24px;
	font-weight: 500;
	margin: 0 0 -20px;
`

export const GlobalStyle = createGlobalStyle`
	body, #__next {
		background-color: ${({ theme }) => theme.background};
	}

  #__next {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100%;
    position: relative;
    color: ${({ theme }) => theme.text1};
    isolation: isolate;

    ${({ theme: { minLg } }) => minLg} {
      flex-direction: row;
    }
  }

  a, input, button, textarea, select {
    &:focus-visible {
      outline: 1px solid ${({ theme }) => theme.text1};
    }
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

	.tooltip-trigger {
		color: ${({ theme }) => theme.text1};
		display: flex;
		align-items: center;
		padding: 0;

		:focus-visible {
			outline-offset: 2px;
		}
	}

	.tooltip-trigger a {
		display: flex;
	}
`
