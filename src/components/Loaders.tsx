export const LoadingDots = () => {
	return (
		<span className="flex gap-0.5">
			<span className="animate-bounce [animation-delay:-0.3s]">.</span>
			<span className="animate-bounce [animation-delay:-0.15s]">.</span>
			<span className="animate-bounce">.</span>
		</span>
	)
}

export const LoadingSpinner = ({ size = 14 }: { size: number }) => {
	return (
		<svg
			className="shrink-0 animate-spin"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			width={size}
			height={size}
		>
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	)
}

export const LocalLoader = () => {
	return <img src="/icons/logo_white.webp" alt="logo of defillama" width={40} height={40} className="animate-loader" />
}
