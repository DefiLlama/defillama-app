export function RssMark({ size = 20, className }: { size?: number; className?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<rect width="24" height="24" rx="5" fill="#ee802f" />
			<circle cx="7" cy="17" r="2" fill="#fff" />
			<path d="M5 11.5a7.5 7.5 0 0 1 7.5 7.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
			<path d="M5 6.5a12.5 12.5 0 0 1 12.5 12.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
		</svg>
	)
}
