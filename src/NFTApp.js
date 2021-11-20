import React, { useState } from 'react'
import { Route, Switch, BrowserRouter, Redirect } from 'react-router-dom'

import { AppWrapper, LayoutWrapper } from './layout'
import NFTDashboard from './pages/NFTDashboard'
import NFTPage from './pages/NFTPage'
import AboutPage from './pages/AboutPage'

import { useNFTChartData, useNFTCollectionsData, useNFTStatisticsData } from './contexts/NFTData'
import LocalLoader from './components/LocalLoader'

function App() {
  const [savedOpen, setSavedOpen] = useState(false)
  const nftCollections = useNFTCollectionsData()
  const nftChartData = useNFTChartData()
  const nftStatistics = useNFTStatisticsData()

  if (nftCollections.length === 0 || nftChartData === undefined || nftStatistics === undefined) {
    return <AppWrapper><BrowserRouter><LocalLoader fill="true" /></BrowserRouter></AppWrapper>
  }

  return (
    <AppWrapper>
      <BrowserRouter>
        <Switch>
          <Route
            exacts
            strict
            path="/nfts/collection/:slug"
            render={({ match }) => (
              <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                <NFTPage
                  slug={match.params.slug}
                />
              </LayoutWrapper>
            )}
          />

          <Route path="/nfts/about">
            <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
              <AboutPage />
            </LayoutWrapper>
          </Route>

          <Route path="/nfts">
            <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
              <NFTDashboard />
            </LayoutWrapper>
          </Route>
        </Switch>
      </BrowserRouter>
    </AppWrapper>
  )
}

export default App