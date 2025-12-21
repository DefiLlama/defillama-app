import { Icon } from '~/components/Icon'

interface SubscriptionUpgradeProps {
	onSubscribe: (paymentMethod: 'stripe' | 'llamapay', onSuccess: (checkoutUrl: string) => void) => void
	loading?: 'stripe' | 'llamapay' | null
}

export const SubscriptionUpgrade = ({ onSubscribe, loading = null }: SubscriptionUpgradeProps) => {
	const handleSubscribe = (paymentMethod: 'stripe' | 'llamapay') => {
		onSubscribe(paymentMethod, (checkoutUrl) => {
			window.location.href = checkoutUrl
		})
	}

	return (
		<div className="rounded-2xl border border-[#39393E] bg-[#1a1b1f] p-6 shadow-lg">
			<h3 className="mb-4 text-lg font-bold">Upgrade to Pro</h3>
			<p className="mb-6 text-[#b4b7bc]">
				Get access to all premium features including API access, advanced charts, and more.
			</p>

			<div className="space-y-3">
				<button
					onClick={() => handleSubscribe('stripe')}
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-3 text-white shadow-md transition-colors hover:bg-[#4A4AF0] disabled:opacity-50"
					disabled={loading === 'stripe'}
				>
					{loading === 'stripe' ? (
						<>
							<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
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
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2a2b30] px-4 py-3 text-white shadow-md transition-colors hover:bg-[#39393E] disabled:opacity-50"
					disabled={loading === 'llamapay'}
				>
					{loading === 'llamapay' ? (
						<>
							<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
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
				<div className="flex gap-4 rounded-lg border border-[#39393E] bg-[#1a1b1f] p-4 transition-colors hover:border-[#5C5CF9]/40">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5C5CF9]/10 text-[#5C5CF9]">
						<Icon name="plug" height={18} width={18} />
					</div>
					<div>
						<h4 className="mb-1 font-medium">API Integration</h4>
						<p className="text-sm text-[#b4b7bc]">
							Access our powerful API for seamless integration with your applications and dashboards.
						</p>
					</div>
				</div>

				<div className="flex gap-4 rounded-lg border border-[#39393E] bg-[#1a1b1f] p-4 transition-colors hover:border-[#5C5CF9]/40">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5C5CF9]/10 text-[#5C5CF9]">
						<Icon name="layers" height={18} width={18} />
					</div>
					<div>
						<h4 className="mb-1 font-medium">LlamaFeed Access</h4>
						<p className="text-sm text-[#b4b7bc]">
							Get exclusive access to LlamaFeed and stay updated with the latest developments in DeFi.
						</p>
					</div>
				</div>

				<div className="flex gap-4 rounded-lg border border-[#39393E] bg-[#1a1b1f] p-4 transition-colors hover:border-[#5C5CF9]/40">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5C5CF9]/10 text-[#5C5CF9]">
						<Icon name="pie-chart" height={18} width={18} />
					</div>
					<div>
						<h4 className="mb-1 font-medium">High Rate Limits</h4>
						<p className="text-sm text-[#b4b7bc]">
							Enjoy higher API rate limits with 1,000 requests per minute and 1M monthly calls.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
