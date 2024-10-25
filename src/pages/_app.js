import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppContext } from '~/contexts'
import { useAnalytics } from '~/hooks'
import '../tailwind.css'

const client = new QueryClient()
function App({ Component, pageProps }) {
	useAnalytics()

	return (
		<QueryClientProvider client={client}>
			<AppContext noContext={pageProps.noContext ?? false}>
				<Component {...pageProps} />
			</AppContext>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}

export default App
