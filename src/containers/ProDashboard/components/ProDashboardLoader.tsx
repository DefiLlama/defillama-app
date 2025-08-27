import * as React from 'react'
import { LoadingDots } from '~/components/LoadingDots'

export function ProDashboardLoader() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="relative h-24 w-24">
				<div className="absolute inset-0 rounded-full border border-(--primary) opacity-10" />

				<div className="absolute inset-0 animate-spin rounded-full" style={{ animationDuration: '3s' }}>
					<div
						className="h-full w-full rounded-full border-2 border-transparent border-t-(--primary) border-r-(--primary)"
						style={{
							background: 'conic-gradient(from 0deg, transparent, var(--primary1) 90deg, transparent 180deg)',
							opacity: 0.3
						}}
					/>
				</div>

				<div
					className="absolute inset-3 animate-spin rounded-full"
					style={{ animationDuration: '2s', animationDirection: 'reverse' }}
				>
					<div className="h-full w-full rounded-full border-2 border-transparent border-b-(--primary) border-l-(--primary)" />
				</div>

				<div className="absolute inset-6 animate-pulse rounded-full bg-(--primary) opacity-10" />

				<div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
					<div className="absolute top-0 left-1/2 -ml-1 h-2 w-2 rounded-full bg-(--primary)" />
				</div>
				<div
					className="absolute inset-0 animate-spin"
					style={{ animationDuration: '3s', animationDirection: 'reverse' }}
				>
					<div className="absolute bottom-0 left-1/2 -ml-0.75 h-1.5 w-1.5 rounded-full bg-(--primary) opacity-60" />
				</div>

				<div className="absolute inset-0 flex items-center justify-center">
					<div className="relative">
						<img
							src="/icons/llama.webp"
							alt="Loading"
							className="h-16 w-16 animate-pulse object-contain"
							style={{ animationDuration: '1.5s' }}
						/>
						<div
							className="absolute inset-0 animate-ping rounded-full opacity-30"
							style={{
								background: 'radial-gradient(circle, var(--primary1), transparent)',
								animationDuration: '2s'
							}}
						/>
					</div>
				</div>
			</div>

			<p className="flex items-center gap-1">
				Loading
				<LoadingDots />
			</p>
		</div>
	)
}
