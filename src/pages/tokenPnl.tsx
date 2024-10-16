import { QueryClient, QueryClientProvider } from 'react-query'
import { getStaticProps as compareProps } from './compare-tokens'
import Layout from '~/layout'
import TokenPnl from '../components/TokenPnl'

const queryClient = new QueryClient()

export const getStaticProps = compareProps

export default function Compare(props) {
	return (
		<QueryClientProvider client={queryClient}>
			<Layout title={`Price with FDV of - DefiLlama`}>
				<TokenPnl {...props} />
			</Layout>
		</QueryClientProvider>
	)
}
