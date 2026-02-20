import Image from 'next/image'
import { LoadingDots } from '~/components/Loaders'

export function ProDashboardLoader() {
	return (
		<div className="isolate flex flex-1 flex-col items-center justify-center gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<div className="relative h-24 w-24">
				<div className="absolute inset-0 rounded-full border border-pro-purple-400 opacity-10" />

				<div className="absolute inset-0 animate-spin rounded-full [animation-duration:3s]">
					<div
						className="-z-10 h-full w-full rounded-full border-2 border-transparent border-t-pro-purple-400 border-r-pro-purple-400 opacity-30"
						style={{
							background:
								'conic-gradient(from 0deg, transparent, var(--color-pro-purple-400) 90deg, transparent 180deg)'
						}}
					/>
				</div>

				<div className="absolute inset-3 animate-spin rounded-full [animation-direction:reverse] [animation-duration:2s]">
					<div className="h-full w-full rounded-full border-2 border-transparent border-b-pro-purple-400 border-l-pro-purple-400" />
				</div>

				<div className="absolute inset-6 animate-pulse rounded-full bg-pro-purple-400 opacity-10" />

				<div className="absolute inset-0 animate-spin [animation-duration:4s]">
					<div className="absolute top-0 left-1/2 -ml-1 h-2 w-2 rounded-full bg-pro-purple-400" />
				</div>
				<div className="absolute inset-0 animate-spin [animation-direction:reverse] [animation-duration:3s]">
					<div className="absolute bottom-0 left-1/2 -ml-0.75 h-1.5 w-1.5 rounded-full bg-pro-purple-400 opacity-60" />
				</div>

				<div className="absolute inset-0 flex items-center justify-center">
					<div className="relative">
						<Image
							src="/assets/llama.webp"
							alt="Loading"
							width={64}
							height={64}
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
