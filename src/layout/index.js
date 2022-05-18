import styled from 'styled-components'
import PinnedData from '../components/PinnedData'
import SideNav from '../components/SideNav'
import Head from 'next/head'
import ThemeProvider, { GlobalStyle } from '../Theme'
import SEO from 'components/SEO'

const Center = styled.main`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  box-sizing: border-box;
`

const PageWrapper = styled.div`
  padding-top: 36px;
  padding-bottom: 80px;
  flex: 1;
  z-index: 9999;
  transition: width 0.25s ease;
  background-color: ${({ theme }) => theme.onlyLight};
  @media screen and (max-width: 600px) {
    & > * {
      padding: 0 12px;
    }
  }
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
        <PageWrapper><Center>{children}</Center></PageWrapper>
        <PinnedData />
      </ThemeProvider>
    </>
  )
}
