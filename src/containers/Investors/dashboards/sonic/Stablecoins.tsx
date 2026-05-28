import { useEffect } from 'react'
import { useContentReady } from '~/containers/Investors/index'

const SKELETON_WIDTHS = [
	['w-16', 'w-2/3', 'w-12', 'w-24', 'w-10'],
	['w-14', 'w-1/2', 'w-14', 'w-20', 'w-16'],
	['w-16', 'w-3/4', 'w-16', 'w-14', 'w-12'],
	['w-14', 'w-2/5', 'w-12', 'w-20', 'w-14'],
	['w-16', 'w-3/5', 'w-14', 'w-16', 'w-10'],
	['w-14', 'w-1/2', 'w-16', 'w-24', 'w-12']
]

export default function Stablecoins() {
	const onContentReady = useContentReady()

	useEffect(() => {
		onContentReady()
	}, [onContentReady])

	return (
		<div className="flex min-h-[calc(100vh-180px)] flex-col">
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
						Stablecoins — Coming Soon
					</span>
				</div>
			</div>
		</div>
	)
}
