import React from 'react'
import ReactDOM from 'react-dom'
import ThemeProvider, { GlobalStyle } from './Theme'
import LocalStorageContextProvider, { Updater as LocalStorageContextUpdater } from './contexts/LocalStorage'
import TokenDataContextProvider, { Updater as TokenDataContextUpdater } from './contexts/TokenData'
import GlobalDataContextProvider from './contexts/GlobalData'
import PairDataContextProvider, { Updater as PairDataContextUpdater } from './contexts/PairData'
import ApplicationContextProvider from './contexts/Application'
import UserContextProvider from './contexts/User'
import NFTDataContextProvider, { Updater as NFTDataContextUpdater } from './contexts/NFTData'
import App from './App'
import NFTApp from './NFTApp'

function ContextProviders({ children }) {
  return (
    <LocalStorageContextProvider>
      <ApplicationContextProvider>
        <TokenDataContextProvider>
          <GlobalDataContextProvider>
            <PairDataContextProvider>
              <UserContextProvider>{children}</UserContextProvider>
            </PairDataContextProvider>
          </GlobalDataContextProvider>
        </TokenDataContextProvider>
      </ApplicationContextProvider>
    </LocalStorageContextProvider>
  )
}

function NFTContextProviders({ children }) {
  return (
    <LocalStorageContextProvider>
      <NFTDataContextProvider>{children}</NFTDataContextProvider>
    </LocalStorageContextProvider>
  )
}

function Updaters() {
  return (
    <>
      <LocalStorageContextUpdater />
      <PairDataContextUpdater />
      <TokenDataContextUpdater />
    </>
  )
}

function NFTUpdaters() {
  return (
    <>
      <LocalStorageContextUpdater />
      <NFTDataContextUpdater />
    </>
  )
}

if (window.location.pathname.includes('/nfts')) {
  ReactDOM.render(
    <NFTContextProviders>
      <NFTUpdaters />
      <ThemeProvider>
        <>
          <GlobalStyle />
          <NFTApp />
        </>
      </ThemeProvider>
    </NFTContextProviders>,
    document.getElementById('root')
  )
} else {
  ReactDOM.render(
    <ContextProviders>
      <Updaters />
      <ThemeProvider>
        <>
          <GlobalStyle />
          <App />
        </>
      </ThemeProvider>
    </ContextProviders>,
    document.getElementById('root')
  )
}
