import LocalStorageContextProvider from '~/contexts/LocalStorage'
import { useAnalytics } from '~/hooks'
import '~/Theme/globals.css'

function App({ Component, pageProps }) {
	useAnalytics()

	return (
		<LocalStorageContextProvider>
			<Component {...pageProps} />
		</LocalStorageContextProvider>
	)
}

export default App
