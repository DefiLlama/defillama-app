import { useEffect } from 'react'
import { useContentReady } from '~/containers/Investors/index'

const PRODUCTS = [
	'Native Swap',
	'Native Perps',
	'Lending',
	'LST',
	'Concentrated Liquidity',
	'Vault',
	'USSD',
	'Perps'
]

const SKELETON_WIDTHS = [
	['w-16', 'w-2/3', 'w-12', 'w-24', 'w-10'],
	['w-14', 'w-1/2', 'w-14', 'w-20', 'w-16'],
	['w-16', 'w-3/4', 'w-16', 'w-14', 'w-12'],
	['w-14', 'w-2/5', 'w-12', 'w-20', 'w-14'],
	['w-16', 'w-3/5', 'w-14', 'w-16', 'w-10'],
	['w-14', 'w-1/2', 'w-16', 'w-24', 'w-12']
]

export default function VerticalIntegration() {
	const onContentReady = useContentReady()

	useEffect(() => {
		onContentReady()
	}, [onContentReady])

	return (
		<div className="flex min-h-[calc(100vh-180px)] flex-col gap-6">
			<div className="max-w-2xl">
				<h2 className="text-lg font-semibold text-(--text-primary)">Vertical Integration</h2>
				<p className="mt-3 text-base leading-relaxed text-(--text-secondary)">
					Vertical integration is Sonic's strategy of building and aligning core applications, infrastructure, and
					liquidity so that economic activity on the network compounds back into the S token rather than leaking to
					disconnected teams or external tokens.
				</p>
				<p className="mt-3 text-base leading-relaxed text-(--text-secondary)">
					Rather than depending on gas fees alone, the goal is to own or integrate the key economic primitives across the
					network so that adoption, usage, and revenue translate into more durable value creation for Sonic.
				</p>
				<a
					href="https://blog.soniclabs.com/vertical-integration-the-missing-link-in-l1-value-creation/"
					target="_blank"
					rel="noopener noreferrer"
					className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-(--sl-accent) transition-colors hover:underline"
				>
					Read more
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
						<path d="M7 17L17 7M17 7H7M17 7v10" />
					</svg>
				</a>
			</div>

			<div className="flex flex-1 flex-col gap-4">
				<h3 className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">Product Breakdown</h3>
				<div className="flex flex-wrap items-center gap-2">
					{PRODUCTS.map((name) => (
						<span
							key={name}
							className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-1.5 text-sm text-(--text-secondary)"
						>
							{name}
						</span>
					))}
				</div>

				<div className="relative flex-1">
					<div className="overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg)">
						<div className="flex flex-col">
							<div className="flex border-b border-(--divider)">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex-1 px-4 py-3.5">
										<div className="h-2.5 w-16 rounded-full bg-(--text-disabled) opacity-40" />
									</div>
								))}
							</div>
							{SKELETON_WIDTHS.map((widths, r) => (
								<div
									key={r}
									className="flex border-b border-(--divider) last:border-b-0"
									style={{ opacity: Math.max(0.15, 0.7 - r * 0.08) }}
								>
									{widths.map((w, c) => (
										<div key={c} className="flex-1 px-4 py-3.5">
											<div className={`${w} h-3 rounded-full bg-(--text-disabled)`} />
										</div>
									))}
								</div>
							))}
						</div>
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-(--cards-bg) via-transparent to-transparent" />
					</div>
					<div className="absolute inset-0 flex items-center justify-center">
						<span className="rounded-full border border-(--cards-border) bg-(--cards-bg) px-5 py-2.5 text-sm font-semibold tracking-wide text-(--text-secondary) shadow-lg">
							Dashboard — Coming Soon
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
