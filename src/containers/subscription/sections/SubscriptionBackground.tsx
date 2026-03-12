export function SubscriptionBackground() {
	return (
		<div className="absolute inset-x-0 top-0 h-[625px] overflow-hidden md:h-[476px]">
			<div className="absolute inset-0 opacity-55 [background-image:var(--sub-grid-image-light)] [background-size:52px_52px] md:[background-size:74px_74px] dark:opacity-50 dark:[background-image:var(--sub-grid-image-dark)]" />
			<div className="absolute top-0 left-1/2 h-[624px] w-[468px] -translate-x-1/2 rounded-full md:top-[-580px] md:h-[1056px] md:w-[1282px]" />
			<div className="absolute inset-0 [background-image:var(--sub-top-gradient-light)] dark:[background-image:var(--sub-top-gradient-dark)]" />
		</div>
	)
}
