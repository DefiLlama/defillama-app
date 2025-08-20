export const ProgressBar = ({ pct }: { pct: number }) => {
	return (
		<div className="relative h-2 w-full overflow-hidden rounded-full bg-[#2a2c32] shadow-inner backdrop-blur-xs">
			<div
				className="h-full rounded-full transition-all duration-1000 ease-out"
				style={{
					width: `${pct}%`,
					background: `linear-gradient(90deg, #5c5cf9, #7b7bff)`,
					boxShadow: '0 0 12px rgba(92, 92, 249, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
				}}
			/>
		</div>
	)
}
