import { lazy, Suspense } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '../Subscribtion/auth'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const examples = [
	{
		signature: '=DEFILLAMA("tvl", "ethereum")',
		description: 'Get current Total Value Locked for Ethereum'
	},
	{
		signature: '=DEFILLAMA_HISTORICAL("tvl", "uniswap", "2024-01-15")',
		description: 'Get historical TVL for Uniswap on a specific date'
	},
	{
		signature: '=DEFILLAMA_HISTORICAL("fees", "tether", "2025-01-01", "2025-02-01")',
		description: 'Get historical fees for Tether on a monthly date range'
	},
	{
		signature: '=DEFILLAMA_STABLECOIN_MCAP("USDT", "ethereum")',
		description: 'Get current USDT market cap on Ethereum'
	}
]

const dataPoints = [
	'Market Metrics: TVL, fees, revenue, and volumes for 6000+ protocols and 400+ chains.',
	'Protocol Health: Monitor TVL changes, chain exposure, and dominance stats.',
	'Stablecoins: Follow market caps, supply by chain, and daily expansion.',
	'Yield Opportunities: Surface pool APY, TVL, and reward breakdowns.',
	'Historical Snapshots: Pull any metric by date with hourly refreshes from DefiLlama.'
]

export default function SheetsContainer() {
	const subscribeModalStore = Ariakit.useDialogStore()
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()

	const onGoogleSheetsButtonClick = () => {
		if (!isAuthenticated || !hasActiveSubscription) {
			subscribeModalStore.show()
			return
		}

		window.open('https://workspace.google.com/marketplace/app/defillama_sheets/571407189628', '_blank')
	}

	const onExcelButtonClick = () => {
		if (!isAuthenticated || !hasActiveSubscription) {
			subscribeModalStore.show()
			return
		}

		window.open('https://marketplace.microsoft.com/en-us/product/WA200009711', '_blank')
	}

	return (
		<div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pb-[64px] xl:max-w-7xl 2xl:max-w-[1440px]">
			<div className="relative mx-auto aspect-square h-[118px] w-[118px] rounded-full object-contain">
				<div
					style={{
						filter: 'blur(64px)',
						background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
					}}
					className="absolute z-0 mx-auto aspect-square h-[132px] w-[132px] rounded-full object-contain"
				/>
				<img
					src="/icons/llama.webp"
					height={118}
					width={118}
					className="z-10 mx-auto aspect-square rounded-full object-contain"
					alt=""
				/>
			</div>

			<div className="flex flex-col gap-3 text-center">
				<h1 className="text-[2rem] font-extrabold">DefiLlama Sheets</h1>
				<p className="text-lg text-[#919296]">Access DeFi data right in your spreadsheets</p>
			</div>

			<div
				className="relative -bottom-15 z-0 mx-auto -mb-[45px] h-[64px] w-[90%] rounded-[50%]"
				style={{
					filter: 'blur(64px)',
					background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
				}}
			/>

			<div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2">
				<div className="rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:transform">
					<div className="mb-4 flex items-center gap-3">
						<div className="rounded-lg bg-[#34a853]/10 p-3">
							<img src="/icons/google-sheets.svg" alt="Google Sheets" className="h-8 w-8" />
						</div>
						<h2 className="text-xl font-bold">Google Sheets</h2>
					</div>
					<p className="mb-6 text-[#b4b7bc]">
						Our Google Sheets add-on brings powerful DeFi analytics directly to your spreadsheets with custom functions.
					</p>
					<div className="flex items-center gap-3">
						<button
							onClick={onGoogleSheetsButtonClick}
							className="inline-flex items-center gap-1 rounded-full border border-[#34a853]/30 bg-[#34a853]/10 px-3 py-1 text-sm text-[#34a853]"
						>
							Get Started
						</button>
					</div>
				</div>

				<div className="flex flex-col justify-between rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:transform">
					<div className="mb-4 flex items-center gap-3">
						<div className="rounded-lg bg-[#217346]/10 p-3">
							<img src="/icons/microsoft-excel-v2.svg" alt="Microsoft Excel" className="h-8 w-8" />
						</div>
						<h2 className="text-xl font-bold">Microsoft Excel</h2>
					</div>
					<p className="mb-6 text-[#b4b7bc]">
						Access DeFi data in Excel with our custom functions add-in for seamless analysis.
					</p>
					<div className="flex items-center gap-3">
						<button
							onClick={onExcelButtonClick}
							className="inline-flex items-center gap-1 rounded-full border border-[#34a853]/30 bg-[#34a853]/10 px-3 py-1 text-sm text-[#34a853]"
						>
							Get Started
						</button>
					</div>
				</div>
			</div>

			<div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
				<div className="rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md">
					<h2 className="mb-4 text-xl font-bold">Data You Can Access</h2>
					<ul className="space-y-6 text-[#b4b7bc]">
						{dataPoints.map((point) => (
							<li key={`sheets-${point}`} className="flex items-center gap-3">
								<Icon name="check-circle" height={16} width={16} className="shrink-0 text-[#5C5CF9]" />
								<span>{point}</span>
							</li>
						))}
					</ul>
				</div>

				<div className="rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md">
					<h2 className="mb-4 text-xl font-bold">Examples</h2>
					<div className="space-y-4">
						{examples.map((func) => (
							<div key={`sheets-${func.signature}`}>
								<div className="mb-2 rounded bg-[#13141a] px-3 py-2 font-mono text-sm text-[#5C5CF9]">
									{func.signature}
								</div>
								<p className="text-sm text-[#b4b7bc]">{func.description}</p>
							</div>
						))}
					</div>
				</div>
			</div>
			<Suspense fallback={<></>}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>
		</div>
	)
}
