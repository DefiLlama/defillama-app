import styled from 'styled-components'

import Link from 'components/Link'
import Row, { RowFixed } from 'components/Row'
import Title from 'components/Title'
import PinnedData from '../components/PinnedData'
import SideNav from '../components/SideNav'
import Head from 'next/head'
import ThemeProvider, { GlobalStyle, TYPE } from '../Theme'
import SEO from 'components/SEO'

export const AppWrapper = styled.div`
  position: relative;
  width: 100%;
`
const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: ${({ open }) => (open ? '220px 1fr 200px' : '220px 1fr 64px')};

  ${({ theme: { maxLg } }) => maxLg} {
    grid-template-columns: 220px 1fr;
  }

  ${({ theme: { maxLg } }) => maxLg} {
    grid-template-columns: 1fr;
    max-width: 100vw;
    overflow: hidden;
    grid-gap: 0;
  }
`

export const Center = styled.div`
  min-height: 100vh;
  height: 100%;
  z-index: 9999;
  transition: width 0.25s ease;
  background-color: ${({ theme }) => theme.onlyLight};
`

/**
 * Wrap the component with the header and sidebar pinned tab
 */
export const LayoutWrapper = ({ children, savedOpen }) => {
  return (
    <ContentWrapper open={savedOpen}>
      <SideNav />
      <Center id="center">{children}</Center>
      <PinnedData />
    </ContentWrapper>
  )
}

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
        <AppWrapper>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AppWrapper>
      </ThemeProvider>
    </>
  )
}

export function VisualisationLayout({ title, children }) {
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

      <ThemeProvider>
        <GlobalStyle />
        <AppWrapper>
          <Center>
            <Row>
              <Link href="/">
                <RowFixed style={{ padding: '1rem', gap: '1rem' }}>
                  <TYPE.main> Return to</TYPE.main>
                  <Title />
                </RowFixed>
              </Link>
            </Row>
            {children}
          </Center>
        </AppWrapper>
      </ThemeProvider>
    </>
  )
}
