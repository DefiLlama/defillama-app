import { QueryClient, QueryClientProvider } from 'react-query'
import ComparePage from '~/components/ComparePage'
import Layout from '~/layout'

const queryClient = new QueryClient()

export default function Compare() {
	return (
		<QueryClientProvider client={queryClient}>
			<Layout title={`Compare Chains - DefiLlama`}>
				<ComparePage />
			</Layout>
		</QueryClientProvider>
	)
}
