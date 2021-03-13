import React, { useState } from 'react'
import styled from 'styled-components'
import { Route, Switch, BrowserRouter, Redirect } from 'react-router-dom'
import GlobalPage from './pages/GlobalPage'
import TokenPage from './pages/TokenPage'
import { useGlobalData, useGlobalChartData } from './contexts/GlobalData'
import { useAllTokenData } from './contexts/TokenData'

import categories from './constants/categories'
import { isValidProtocol } from './utils'
import AllTokensPage from './pages/AllTokensPage'
import AboutPage from './pages/AboutPage'

import PinnedData from './components/PinnedData'

import SideNav from './components/SideNav'
import LocalLoader from './components/LocalLoader'

const AppWrapper = styled.div`
  position: relative;
  width: 100%;
`
const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: ${({ open }) => (open ? '220px 1fr 200px' : '220px 1fr 64px')};

  @media screen and (max-width: 1400px) {
    grid-template-columns: 220px 1fr;
  }

  @media screen and (max-width: 1080px) {
    grid-template-columns: 1fr;
    max-width: 100vw;
    overflow: hidden;
    grid-gap: 0;
  }
`

const Right = styled.div`
  position: fixed;
  right: 0;
  bottom: 0rem;
  z-index: 99;
  width: ${({ open }) => (open ? '220px' : '64px')};
  height: ${({ open }) => (open ? 'fit-content' : '64px')};
  overflow: scroll;
  background-color: ${({ theme }) => theme.bg1};
  @media screen and (max-width: 1400px) {
    display: none;
  }
`

const Center = styled.div`
  height: 100%;
  z-index: 9999;
  transition: width 0.25s ease;
  background-color: ${({ theme }) => theme.onlyLight};
`

/**
 * Wrap the component with the header and sidebar pinned tab
 */
const LayoutWrapper = ({ children, savedOpen, setSavedOpen }) => {
  return (
    <>
      <ContentWrapper open={savedOpen}>
        <SideNav />
        <Center id="center">{children}</Center>
        <Right open={savedOpen}>
          <PinnedData open={savedOpen} setSavedOpen={setSavedOpen} />
        </Right>
      </ContentWrapper>
    </>
  )
}

function App() {
  const [savedOpen, setSavedOpen] = useState(false)

  const globalData = useGlobalData()
  const globalChartData = useGlobalChartData()
  const allTokens = useAllTokenData()

  return (
    <AppWrapper>
      {globalData &&
        Object.keys(globalData).length > 0 &&
        globalChartData &&
        Object.keys(globalChartData).length > 0 &&
        allTokens &&
        Object.keys(allTokens).length > 0 ? (
        <BrowserRouter>
          <Switch>
            <Route
              exacts
              strict
              path="/protocol/:protocol"
              render={({ match }) => {
                if (isValidProtocol(allTokens, match.params.protocol.toLowerCase())) {
                  return (
                    <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                      <TokenPage protocol={match.params.protocol.toLowerCase().replace('-', ' ')} />
                    </LayoutWrapper>
                  )
                } else {
                  return <Redirect to="/home" />
                }
              }}
            />
            <Route
              exacts
              strict
              path="/protocols/:protocol"
              render={({ match }) => {
                const category = categories[match.params.protocol]
                if (category !== undefined) {
                  return (<LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                    <AllTokensPage category={category.name} categoryName={category.name} />
                  </LayoutWrapper>)
                } else {
                  return <Redirect to="/protocols" />
                }
              }}
            />

            <Route path="/home">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <GlobalPage />
              </LayoutWrapper>
            </Route>

            <Route path="/protocols">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <AllTokensPage />
              </LayoutWrapper>
            </Route>
            <Route path="/dexes">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <AllTokensPage category="Dexes" />
              </LayoutWrapper>
            </Route>
            <Route path="/about">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <AboutPage />
              </LayoutWrapper>
            </Route>

            <Redirect to="/home" />
          </Switch>
        </BrowserRouter>
      ) : (
        <LocalLoader fill="true" />
      )}
    </AppWrapper>
  )
}

export default App
