import React, { useState, lazy, Suspense } from 'react'
import { Route, Switch, BrowserRouter, Redirect } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'

import { useGlobalData, useGlobalChartData } from './contexts/GlobalData'
import { useAllTokenData } from './contexts/TokenData'
import { isValidProtocol } from './utils'
import ErrorPage from './pages/ErrorPage'

import LocalLoader from './components/LocalLoader'
import { AppWrapper, LayoutWrapper } from './layout'
import GlobalPage from './pages/GlobalPage'

const AboutPage = lazy(() => import('./pages/AboutPage'))
const AllTokensPage = lazy(() => import('./pages/AllTokensPage'))
const ChainsViewPage = lazy(() => import('./pages/ChainsViewPage'))
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'))
const RecentListingsPage = lazy(() => import('./pages/RecentListingsPage'))

const Jpegged = lazy(() => import('./pages/Jpegged'))
const NoTokenProtocols = lazy(() => import('./pages/NoTokenProtocols'))
const Settings = lazy(() => import('./pages/Settings'))
const TokenPage = lazy(() => import('./pages/TokenPage'))

function App() {
  const [savedOpen, setSavedOpen] = useState(false)

  const allTokens = useAllTokenData()

  return (
    <AppWrapper>
      <BrowserRouter>
        <ErrorBoundary FallbackComponent={ErrorPage}>
          <Switch>
            <Route
              exacts
              strict
              path="/protocol/:protocol/:chain?/:denomination?"
              render={({ match }) => {
                return (
                  <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                    <TokenPage
                      protocol={match.params.protocol.toLowerCase()}
                      denomination={match.params.denomination}
                      selectedChain={match.params.chain}
                    />
                  </LayoutWrapper>
                )
              }}
            />
            <Route
              exacts
              strict
              path="/protocols/:category/:chain?"
              render={({ match }) => {
                const category = match.params.category
                const chain = match.params.chain
                if (
                  Object.values(allTokens).some(
                    protocol => (protocol.category || '').toLowerCase() === category.toLowerCase()
                  )
                ) {
                  return (
                    <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                      <AllTokensPage category={category} selectedChain={chain} />
                    </LayoutWrapper>
                  )
                } else {
                  return <Redirect to="/protocols" />
                }
              }}
            />
            <Route
              exacts
              strict
              path="/chain/:selectedChain/:useless?/:denomination?"
              render={({ match }) => {
                return (
                  <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                    <GlobalPage
                      selectedChain={match.params.selectedChain}
                      denomination={match.params.denomination}
                    />
                  </LayoutWrapper>
                )
              }}
            />

            <Route path="/jpegged">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <Jpegged />
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
            <Route path="/recent">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <RecentListingsPage />
              </LayoutWrapper>
            </Route>
            <Route path="/chains">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <ChainsViewPage />
              </LayoutWrapper>
            </Route>
            <Route
              path="/comparison/:protocolA?/:protocolB?"
              render={({ match }) => (
                <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                  <ComparisonPage
                    protocolA={match?.params?.protocolA?.toLowerCase()}
                    protocolB={match?.params?.protocolB?.toLowerCase()}
                  />
                </LayoutWrapper>
              )}
            />
            <Route exact path="/">
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <GlobalPage />
              </LayoutWrapper>
            </Route>

            <Redirect to="/" />
          </Switch>
        </ErrorBoundary>
      </BrowserRouter>
    </AppWrapper>
  )
}

export default App
