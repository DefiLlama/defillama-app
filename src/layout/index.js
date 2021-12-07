import styled from 'styled-components'

import PinnedData from '../components/PinnedData'
import SideNav from '../components/SideNav'
import LocalStorageContextProvider, { Updater as LocalStorageContextUpdater } from '../contexts/LocalStorage'
import Head from 'next/head'
import ThemeProvider, { GlobalStyle } from '../Theme'

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

const Center = styled.div`
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

export function GeneralLayout({ title, children }) {
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
      <LocalStorageContextProvider>
        <LocalStorageContextUpdater />
        <ThemeProvider>
          <GlobalStyle />
          <AppWrapper>
            <LayoutWrapper>{children}</LayoutWrapper>
          </AppWrapper>
        </ThemeProvider>
      </LocalStorageContextProvider>
    </>
  )
}
