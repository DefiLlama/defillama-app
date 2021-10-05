import React, { useState } from 'react'
import { Route, Switch, BrowserRouter, Redirect } from 'react-router-dom'

import { AppWrapper, LayoutWrapper } from './layout'
import NFTDashboard from './pages/NFTDashboard'
import NFTPage from './pages/NFTPage'
import AboutPage from './pages/AboutPage'

import { useNFTChartData, useNFTCollectionsData } from './contexts/NFTData'
import { isValidCollection } from './utils'
import LocalLoader from './components/LocalLoader'

function App() {
  const [savedOpen, setSavedOpen] = useState(false)
  const nftCollections = useNFTCollectionsData()
  const nftChartData = useNFTChartData()

  if (nftCollections.length === 0 || nftChartData === undefined) {
    return <AppWrapper><LocalLoader fill="true" /></AppWrapper>
  }

  return (
    <AppWrapper>
      <BrowserRouter>
        <Switch>
          <Route
            exacts
            strict
            path="/nfts/collection/:collection"
            render={({ match }) => {
              if (isValidCollection(nftCollections, match.params.collection)) {
                return (
                  <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                    <NFTPage
                      collection={match.params.collection}
                    />
                  </LayoutWrapper>
                )
              } else {
                return <Redirect to="/nfts" />
              }
            }}
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