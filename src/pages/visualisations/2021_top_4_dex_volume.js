import Row, { RowFixed } from 'components/Row'
import LocalStorageContextProvider from 'contexts/LocalStorage'
import ThemeProvider, { GlobalStyle, TYPE } from 'Theme'
import Link from 'components/Link'
import Title from 'components/Title'

// for some reason I can't wrap this with a react functional component or else the iframe won't calculate the width properly
export default function Protocols() {
  return (
    <LocalStorageContextProvider>
      <ThemeProvider>
        <GlobalStyle />
        <Row>
          <Link href="/">
            <RowFixed style={{ padding: '1rem', gap: '1rem' }}>
              <TYPE.main> Return to</TYPE.main>
              <Title />
            </RowFixed>
          </Link>
        </Row>
        <Row style={{ height: '100%', padding: '1rem' }}>
          <iframe
            src="https://flo.uri.sh/visualisation/8070979/embed"
            title="Interactive or visual content"
            className="flourish-embed-iframe"
            frameBorder="0"
            scrolling="no"
            style={{ width: '100%', height: '600px' }}
            sandbox="allow-same-origin allow-forms allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        </Row>
      </ThemeProvider>
    </LocalStorageContextProvider>
  )
}
