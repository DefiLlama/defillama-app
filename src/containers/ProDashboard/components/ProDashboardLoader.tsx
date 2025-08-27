import * as React from 'react'
import { LoadingDots } from '~/components/LoadingDots'

export function ProDashboardLoader() {
	return (
		<div className="isolate flex flex-1 flex-col items-center justify-center gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<div className="relative h-24 w-24">
				<div className="border-pro-purple-400 absolute inset-0 rounded-full border opacity-10" />

				<div className="absolute inset-0 animate-spin rounded-full [animation-duration:3s]">
					<div
						className="border-t-pro-purple-400 border-r-pro-purple-400 -z-10 h-full w-full rounded-full border-2 border-transparent opacity-30"
						style={{
							background:
								'conic-gradient(from 0deg, transparent, var(--color-pro-purple-400) 90deg, transparent 180deg)'
						}}
					/>
				</div>

				<div className="absolute inset-3 animate-spin rounded-full [animation-direction:reverse] [animation-duration:2s]">
					<div className="border-b-pro-purple-400 border-l-pro-purple-400 h-full w-full rounded-full border-2 border-transparent" />
				</div>

				<div className="bg-pro-purple-400 absolute inset-6 animate-pulse rounded-full opacity-10" />

				<div className="absolute inset-0 animate-spin [animation-duration:4s]">
					<div className="bg-pro-purple-400 absolute top-0 left-1/2 -ml-1 h-2 w-2 rounded-full" />
				</div>
				<div className="absolute inset-0 animate-spin [animation-direction:reverse] [animation-duration:3s]">
					<div className="bg-pro-purple-400 absolute bottom-0 left-1/2 -ml-0.75 h-1.5 w-1.5 rounded-full opacity-60" />
				</div>

				<div className="absolute inset-0 flex items-center justify-center">
					<div className="relative">
						<img
							src="/icons/llama.webp"
							alt="Loading"
							className="z-10 h-16 w-16 object-contain [animation-duration:1.5s]"
						/>
						<div
							className="absolute inset-0 -z-10 animate-ping rounded-full opacity-30 [animation-duration:2s]"
							style={{
								background: 'radial-gradient(circle, var(--color-pro-purple-400), transparent)'
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
