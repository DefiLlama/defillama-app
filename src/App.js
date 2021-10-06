import React, { useState } from 'react'
import { Route, Switch, BrowserRouter, Redirect } from 'react-router-dom'
import { AppWrapper, LayoutWrapper } from './layout'
import GlobalPage from './pages/GlobalPage'
import TokenPage from './pages/TokenPage'
import Settings from './pages/Settings'
import Jpegged from './pages/Jpegged'
import ChainsViewPage from './pages/ChainsViewPage'
import NoTokenProtocols from './pages/NoTokenProtocols'
import { useGlobalData, useGlobalChartData } from './contexts/GlobalData'
import { useAllTokenData } from './contexts/TokenData'

import { isValidProtocol } from './utils'
import AllTokensPage from './pages/AllTokensPage'
import AboutPage from './pages/AboutPage'

import LocalLoader from './components/LocalLoader'

function App() {
  const [savedOpen, setSavedOpen] = useState(false)

  const globalData = useGlobalData()
  const globalChartData = useGlobalChartData()
  const allTokens = useAllTokenData()

  return (
    <AppWrapper>
      <BrowserRouter>
      {globalData &&
        globalData.totalLiquidityUSD &&
        globalChartData &&
        globalChartData[1] &&
        allTokens &&
        allTokens[1] ? (
          <Switch>
            <Route
              exacts
              strict
              path="/protocol/:protocol/:chain?/:denomination?"
              render={({ match }) => {
                if (isValidProtocol(allTokens, match.params.protocol.toLowerCase())) {
                  return (
                    <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                      <TokenPage
                        protocol={match.params.protocol.toLowerCase()}
                        denomination={match.params.denomination}
                        selectedChain={match.params.chain}
                      />
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
              path="/protocols/:category"
              render={({ match }) => {
                const category = match.params.category
                if (Object.values(allTokens).some(protocol => (protocol.category || '').toLowerCase() === category.toLowerCase())) {
                  return (<LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                    <AllTokensPage category={category} categoryName={category} />
                  </LayoutWrapper>)
                } else {
                  return <Redirect to="/protocols" />
                }
              }}
            />
            <Route
              exacts
              strict
              path="/chain/:chain/:useless?/:denomination?"
              render={({ match }) => {
                return <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                  <GlobalPage chain={match.params.chain} denomination={match.params.denomination} />
                </LayoutWrapper>
              }}
            />

            <Route path="/jpegged">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <Jpegged />
              </LayoutWrapper>
            </Route>


            <Route path="/home">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <GlobalPage />
              </LayoutWrapper>
            </Route>

            <Route path="/settings">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <Settings />
              </LayoutWrapper>
            </Route>

            <Route path="/protocols">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <AllTokensPage />
              </LayoutWrapper>
            </Route>
            <Route path="/airdrops">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <NoTokenProtocols />
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
            <Route path="/chains">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <ChainsViewPage />
              </LayoutWrapper>
            </Route>

            <Redirect to="/home" />
          </Switch>
      ) : (
        <LocalLoader fill="true" />
      )}
      </BrowserRouter>
    </AppWrapper>
  )
}

export default App
