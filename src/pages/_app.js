import { AppContext } from '~/contexts'
import { useAnalytics } from '~/hooks'
import '~/Theme/globals.css'

function App({ Component, pageProps }) {
	useAnalytics()

	return (
		<AppContext noContext={pageProps.noContext ?? false}>
			<Component {...pageProps} />
		</AppContext>
	)
}

export default App
