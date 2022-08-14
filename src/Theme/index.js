import * as React from 'react'
import styled, { ThemeProvider as StyledComponentsThemeProvider, createGlobalStyle } from 'styled-components'
import { Text } from 'rebass'
import { transparentize } from 'polished'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { sm, med, lg, xl, twoXl } from '~/constants/breakpoints'

export default function ThemeProvider({ children }) {
	const [darkMode] = useDarkModeManager()

	return <StyledComponentsThemeProvider theme={theme(darkMode)}>{children}</StyledComponentsThemeProvider>
}

const theme = (darkMode, color) => ({
	customColor: color,
	textColor: darkMode ? color : 'black',
	mode: darkMode ? 'dark' : 'light',

	panelColor: darkMode ? 'rgba(255, 255, 255, 0)' : 'rgba(255, 255, 255, 0)',
	backgroundColor: darkMode ? '#212429' : '#445ed0',

	uniswapPink: darkMode ? '#445ed0' : 'black',

	concreteGray: darkMode ? '#292C2F' : '#FAFAFA',
	inputBackground: darkMode ? '#1F1F1F' : '#FAFAFA',
	shadowColor: darkMode ? '#000' : '#2F80ED',
	mercuryGray: darkMode ? '#333333' : '#E1E1E1',

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
	modalBG: darkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
	advancedBG: darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
	onlyLight: darkMode ? '#22242a' : 'transparent',
	divider: darkMode ? 'rgba(43, 43, 43, 0.435)' : 'rgba(43, 43, 43, 0.035)',

	//primary colors
	primary1: darkMode ? '#2172E5' : '#445ed0',
	primary2: darkMode ? '#3680E7' : '#FF8CC3',
	primary3: darkMode ? '#4D8FEA' : '#FF99C9',
	primary4: darkMode ? '#376bad70' : '#F6DDE8',
	primary5: darkMode ? '#153d6f70' : '#FDEAF1',

	// color text
	primaryText1: darkMode ? '#6da8ff' : '#445ed0',

	// secondary colors
	secondary1: darkMode ? '#2172E5' : '#445ed0',
	secondary2: darkMode ? '#17000b26' : '#F6DDE8',
	secondary3: darkMode ? '#17000b26' : '#FDEAF1',

	// other
	red1: '#FF6871',
	green1: '#27AE60',
	yellow1: '#FFE270',
	yellow2: '#F3841E',
	link: '#2172E5',
	blue: '#2f80ed',
	background: darkMode ? 'black' : `radial-gradient(50% 50% at 50% 50%, #445ed0 0%, #fff 0%)`,

	//shadow
	shadow1: darkMode ? '#000' : '#2F80ED',
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

	small(props) {
		return <TextWrapper fontWeight={500} fontSize={11} color={'text1'} {...props} />
	},

	header(props) {
		return <TextWrapper fontWeight={600} color={'text1'} {...props} />
	},

	largeHeader(props) {
		return <TextWrapper fontWeight={500} color={'text1'} fontSize={24} {...props} />
	},

	light(props) {
		return <TextWrapper fontWeight={400} color={'text3'} fontSize={14} {...props} />
	},

	pink(props) {
		return <TextWrapper fontWeight={props.faded ? 400 : 600} color={props.faded ? 'text1' : 'text1'} {...props} />
	}
}

export const Header = styled.h1`
	color: ${({ theme }) => theme['text1']};
	font-size: 24px;
	font-weight: 500;
	margin: 0 0 -20px;
`

export const ThemedBackground = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	pointer-events: none;
	max-width: 100vw !important;
	height: 200vh;
	mix-blend-mode: color;
	background: ${({ backgroundColor, theme }) =>
		`radial-gradient(50% 50% at 50% 50%, ${
			backgroundColor || transparentize(0.6, theme.primary1)
		} 0%, rgba(255, 255, 255, 0) 100%)`};
	z-index: -100;
	transform: translateY(-110vh);
`

export const GlobalStyle = createGlobalStyle`
  #__next {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100%;
    position: relative;
    color: ${({ theme }) => theme.text1};
    background-color: ${({ theme }) => theme.onlyLight};
    isolation: isolate;

    ${({ theme: { minLg } }) => minLg} {
      flex-direction: row;
    }
  }

  a, input, button, textarea, select, {
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
`
