import styled from 'styled-components'
import PinnedData from '../components/PinnedData'
import SideNav from '../components/SideNav'
import Head from 'next/head'
import ThemeProvider, { GlobalStyle } from '../Theme'
import SEO from 'components/SEO'

export const Center = styled.main`
  flex: 1;
  z-index: 9999;
  transition: width 0.25s ease;
  background-color: ${({ theme }) => theme.onlyLight};
`

export function GeneralLayout({ title, children, defaultSEO = false }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <link
          rel="preload"
          href="/font-files/Inter-roman.var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        ></link>
      </Head>

      {defaultSEO && <SEO />}

      <ThemeProvider>
        <GlobalStyle />
        <SideNav />
        <Center>{children}</Center>
        <PinnedData />
      </ThemeProvider>
    </>
  )
}
