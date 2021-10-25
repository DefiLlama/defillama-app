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
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
Sentry.init({
  dsn: "https://6275aede5b894e458928c7995635dd1d@o555782.ingest.sentry.io/6034860",
  integrations: [new Integrations.BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

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
