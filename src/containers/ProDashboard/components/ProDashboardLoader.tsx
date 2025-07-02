import React from 'react'

export function ProDashboardLoader() {
	const [dotCount, setDotCount] = React.useState(1)

	React.useEffect(() => {
		const interval = setInterval(() => {
			setDotCount((prev) => (prev === 3 ? 1 : prev + 1))
		}, 500)
		return () => clearInterval(interval)
	}, [])

	return (
		<div className="flex flex-col justify-center items-center min-h-[60vh] gap-8">
			<div className="relative w-24 h-24">
				<div className="absolute inset-0 rounded-full border border-(--primary1) opacity-10" />

				<div className="absolute inset-0 rounded-full animate-spin" style={{ animationDuration: '3s' }}>
					<div
						className="h-full w-full rounded-full border-2 border-transparent border-t-(--primary1) border-r-(--primary1)"
						style={{
							background: 'conic-gradient(from 0deg, transparent, var(--primary1) 90deg, transparent 180deg)',
							opacity: 0.3
						}}
					/>
				</div>

				<div
					className="absolute inset-3 rounded-full animate-spin"
					style={{ animationDuration: '2s', animationDirection: 'reverse' }}
				>
					<div className="h-full w-full rounded-full border-2 border-transparent border-b-(--primary1) border-l-(--primary1)" />
				</div>

				<div className="absolute inset-6 rounded-full bg-(--primary1) opacity-10 animate-pulse" />

				<div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
					<div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 rounded-full bg-(--primary1)" />
				</div>
				<div
					className="absolute inset-0 animate-spin"
					style={{ animationDuration: '3s', animationDirection: 'reverse' }}
				>
					<div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 -ml-0.75 rounded-full bg-(--primary1) opacity-60" />
				</div>

				<div className="absolute inset-0 flex items-center justify-center">
					<div className="relative">
						<img
							src="/llama.png"
							alt="Loading"
							className="w-16 h-16 object-contain animate-pulse"
							style={{ animationDuration: '1.5s' }}
						/>
						<div
							className="absolute inset-0 rounded-full opacity-30 animate-ping"
							style={{
								background: 'radial-gradient(circle, var(--primary1), transparent)',
								animationDuration: '2s'
							}}
						/>
					</div>
				</div>
			</div>

			<div className="text-lg font-medium text-(--text2)">Loading{'.'.repeat(dotCount)}</div>
		</div>
	)
}
