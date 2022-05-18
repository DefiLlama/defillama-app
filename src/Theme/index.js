import React from 'react'
import { ThemeProvider as StyledComponentsThemeProvider, createGlobalStyle } from 'styled-components'
import styled from 'styled-components'
import { Text } from 'rebass'
import { transparentize } from 'polished'

import { sm, med, lg, xl } from '../constants/breakpoints'
import { useDarkModeManager } from '../contexts/LocalStorage'

export default function ThemeProvider({ children }) {
  const [darkMode] = useDarkModeManager()

  return <StyledComponentsThemeProvider theme={theme(darkMode)}>{children}</StyledComponentsThemeProvider>
}

const theme = (darkMode, color) => ({
  customColor: color,
  textColor: darkMode ? color : 'black',

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

  shadow1: darkMode ? '#000' : '#2F80ED',

  // other
  red1: '#FF6871',
  green1: '#27AE60',
  yellow1: '#FFE270',
  yellow2: '#F3841E',
  link: '#2172E5',
  blue: '#2f80ed',
  background: darkMode ? 'black' : `radial-gradient(50% 50% at 50% 50%, #445ed0 0%, #fff 0%)`,

  // breakpoints
  bpSm: `${sm}px`,
  bpMed: `${med}px`,
  bpLg: `${lg}px`,
  bpXl: `${xl}px`,

  maxSm: `@media screen and (max-width: ${sm}px)`,
  maxMed: `@media screen and (max-width: ${med}px)`,
  maxLg: `@media screen and (max-width: ${lg}px)`,
  maxXl: `@media screen and (max-width: ${xl}px)`,

  minSm: `@media screen and (min-width: ${sm}px)`,
  minMed: `@media screen and (min-width: ${med}px)`,
  minLg: `@media screen and (min-width: ${lg}px)`,
  minXl: `@media screen and (min-width: ${xl}px)`,

  breakpoints: [`${sm}px`, `${med}px`, `${lg}px`, `${xl}px`],
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
  },
}

export const Header = styled.h1`
  color: ${({ theme }) => theme['text1']};
  font-size: 24px;
  font-weight: 500;
  margin: 0px;
`

export const Hover = styled.div`
  :hover {
    cursor: pointer;
  }
`

export const Link = styled.a.attrs({
  target: '_blank',
  rel: 'noopener noreferrer',
})`
  text-decoration: none;
  cursor: pointer;
  color: ${({ theme }) => theme.primary1};
  font-weight: 500;
  :hover {
    text-decoration: underline;
  }
  :focus {
    outline: none;
    text-decoration: underline;
  }
  :active {
    text-decoration: none;
  }
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
  position: absolute;
  top: 0px;
  left: 0px;
  z-index: 9999;

  transform: translateY(-110vh);
`

export const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'Inter';
    font-style:  normal;
    font-weight: 400;
    font-display: swap;
    src: url("font-files/Inter-Regular.woff2?v=3.19") format("woff2"),
         url("font-files/Inter-Regular.woff?v=3.19") format("woff");
  }
  @font-face {
    font-family: 'Inter';
    font-style:  normal;
    font-weight: 500;
    font-display: swap;
    src: url("font-files/Inter-Medium.woff2?v=3.19") format("woff2"),
         url("font-files/Inter-Medium.woff?v=3.19") format("woff");
  }
  @font-face {
    font-family: 'Inter';
    font-style:  normal;
    font-weight: 600;
    font-display: swap;
    src: url("font-files/Inter-SemiBold.woff2?v=3.19") format("woff2"),
         url("font-files/Inter-SemiBold.woff?v=3.19") format("woff");
  }

  html { font-family: 'Inter', sans-serif; }
  @supports (font-variation-settings: normal) {
    html { font-family: 'Inter var', sans-serif; }
  }

  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }

  a {
    text-decoration: none;

    :hover {
      text-decoration: none
    }
  }


  .three-line-legend {
    width: 100%;
    height: 70px;
    position: absolute;
    padding: 8px;
    font-size: 12px;
    color: #20262E;
    background-color: rgba(255, 255, 255, 0.23);
    text-align: left;
    z-index: 10;
    pointer-events: none;
  }

  .three-line-legend-dark {
    width: 100%;
    height: 70px;
    position: absolute;
    padding: 8px;
    font-size: 12px;
    color: white;
    background-color: rgba(255, 255, 255, 0.23);
    text-align: left;
    z-index: 10;
    pointer-events: none;
  }

  .tv-lightweight-charts{
    width: 100% !important;


    & > * {
      width: 100% !important;
    }
  }


  html {
    font-size: 1rem;
    font-variant: none;
    color: 'black';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  }


  #__next {
    font-size: 14px;
    background-color: ${({ theme }) => theme.bg6};
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;

    ${({ theme: { minLg } }) => minLg} {
      flex-direction: row
    }
  }
`
