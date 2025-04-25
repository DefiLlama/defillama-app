import { Icon } from '~/components/Icon'

interface SubscriptionUpgradeProps {
	onSubscribe: (paymentMethod: 'stripe' | 'llamapay', onSuccess: (checkoutUrl: string) => void) => void
	loading?: 'stripe' | 'llamapay' | null
}

export const SubscriptionUpgrade = ({ onSubscribe, loading = null }: SubscriptionUpgradeProps) => {
	const handleSubscribe = (paymentMethod: 'stripe' | 'llamapay') => {
		onSubscribe(paymentMethod, (checkoutUrl) => {
			window.open(checkoutUrl, '_blank')
		})
	}

	return (
		<div className="bg-[#1a1b1f] rounded-2xl border border-[#39393E] p-6 shadow-lg">
			<h3 className="text-lg font-bold mb-4">Upgrade to Pro</h3>
			<p className="text-[#b4b7bc] mb-6">
				Get access to all premium features including API access, advanced charts, and more.
			</p>

			<div className="space-y-3">
				<button
					onClick={() => handleSubscribe('stripe')}
					className="w-full py-3 px-4 bg-[#5C5CF9] hover:bg-[#4A4AF0] text-white rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
					disabled={loading === 'stripe'}
				>
					{loading === 'stripe' ? (
						<>
							<span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
							Processing...
						</>
					) : (
						<>
							<Icon name="credit-card" height={16} width={16} />
							Subscribe with Stripe
						</>
					)}
				</button>

				<button
					onClick={() => handleSubscribe('llamapay')}
					className="w-full py-3 px-4 bg-[#2a2b30] hover:bg-[#39393E] text-white rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
					disabled={loading === 'llamapay'}
				>
					{loading === 'llamapay' ? (
						<>
							<span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
							Processing...
						</>
					) : (
						<>
							<Icon name="wallet" height={16} width={16} />
							Subscribe with Crypto
						</>
					)}
				</button>
			</div>

			<div className="mt-8 space-y-4">
				<div className="flex gap-4 p-4 bg-[#1a1b1f] border border-[#39393E] rounded-lg hover:border-[#5C5CF9]/40 transition-colors">
					<div className="flex-shrink-0 bg-[#5C5CF9]/10 text-[#5C5CF9] h-10 w-10 flex items-center justify-center rounded-lg">
						<Icon name="plug" height={18} width={18} />
					</div>
					<div>
						<h4 className="font-medium mb-1">API Integration</h4>
						<p className="text-sm text-[#b4b7bc]">
							Access our powerful API for seamless integration with your applications and dashboards.
						</p>
					</div>
				</div>

				<div className="flex gap-4 p-4 bg-[#1a1b1f] border border-[#39393E] rounded-lg hover:border-[#5C5CF9]/40 transition-colors">
					<div className="flex-shrink-0 bg-[#5C5CF9]/10 text-[#5C5CF9] h-10 w-10 flex items-center justify-center rounded-lg">
						<Icon name="layers" height={18} width={18} />
					</div>
					<div>
						<h4 className="font-medium mb-1">LlamaFeed Access</h4>
						<p className="text-sm text-[#b4b7bc]">
							Get exclusive access to LlamaFeed and stay updated with the latest developments in DeFi.
						</p>
					</div>
				</div>

				<div className="flex gap-4 p-4 bg-[#1a1b1f] border border-[#39393E] rounded-lg hover:border-[#5C5CF9]/40 transition-colors">
					<div className="flex-shrink-0 bg-[#5C5CF9]/10 text-[#5C5CF9] h-10 w-10 flex items-center justify-center rounded-lg">
						<Icon name="pie-chart" height={18} width={18} />
					</div>
					<div>
						<h4 className="font-medium mb-1">High Rate Limits</h4>
						<p className="text-sm text-[#b4b7bc]">
							Enjoy higher API rate limits with 1,000 requests per minute and 1M monthly calls.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
