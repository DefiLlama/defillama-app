export function ResearchLoader() {
	return (
		<div role="status" aria-live="polite" className="research-loader">
			<div className="rl" aria-hidden>
				<span className="rl__layer rl__layer--light" />
				<span className="rl__layer rl__layer--dark" />
			</div>
			<span className="sr-only">Loading research…</span>
		</div>
	)
}
