import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppContext } from '~/contexts'
import { useAnalytics } from '~/hooks'
import '~/Theme/globals.css'

const client = new QueryClient()
function App({ Component, pageProps }) {
	useAnalytics()

	return (
		<QueryClientProvider client={client}>
			<AppContext noContext={pageProps.noContext ?? false}>
				<Component {...pageProps} />
			</AppContext>
		</QueryClientProvider>
	)
}

export default App
