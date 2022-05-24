import React from 'react'
import styled from 'styled-components'
import PinnedData from '../components/PinnedData'
import SideNav from '../components/SideNav'
import Head from 'next/head'
import ThemeProvider, { GlobalStyle, ThemedBackground } from '../Theme'
import SEO from 'components/SEO'
import { transparentize } from 'polished'

const Center = styled.main`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  color: ${({ theme }) => theme.text1};
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

interface ILayoutProps {
  title: string
  children: React.ReactNode
  defaultSEO?: boolean
  backgroundColor?: string
}

interface IBackground {
  backgroundColor?: string
}

const Background = styled(ThemedBackground)<IBackground>``

export default function Layout({ title, children, defaultSEO = false, backgroundColor, ...props }: ILayoutProps) {
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
        <PageWrapper>
          <Background backgroundColor={backgroundColor || transparentize(0.8, '#445ed0')} />
          <Center {...props}>{children}</Center>
        </PageWrapper>
        <PinnedData />
      </ThemeProvider>
    </>
  )
}
