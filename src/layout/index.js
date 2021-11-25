import React from 'react'
import styled from 'styled-components'

import PinnedData from '../components/PinnedData'
import SideNav from '../components/SideNav'
import { useState } from 'react'
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
export const LayoutWrapper = ({ children, savedOpen, setSavedOpen }) => {
  return (
    <ContentWrapper open={savedOpen}>
      <SideNav />
      <Center id="center">{children}</Center>
      <PinnedData open={savedOpen} setSavedOpen={setSavedOpen} />
    </ContentWrapper>
  )
}

export function GeneralLayout({ title, children }) {
  const [savedOpen, setSavedOpen] = useState(false)
  return (
    <>
      <Head>
        <title>{title}</title>
        <script src="https://cdn.usefathom.com/script.js" data-site="OANJVQNZ" defer></script>
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
            <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
              {children}
            </LayoutWrapper>
          </AppWrapper>
        </ThemeProvider>
      </LocalStorageContextProvider>
    </>
  )
}
