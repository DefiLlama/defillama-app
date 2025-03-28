import { SubscribeHome } from '~/containers/Subscribtion/Home'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { AuthProvider } from '~/containers/Subscribtion/auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider } from '~/layout/WalletProvider'

const queryClient = new QueryClient()

export default function Subscribe() {
	return (
		<WalletProvider>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<SubscribeLayout>
						<SubscribeHome />
					</SubscribeLayout>
				</AuthProvider>
			</QueryClientProvider>
		</WalletProvider>
	)
}
