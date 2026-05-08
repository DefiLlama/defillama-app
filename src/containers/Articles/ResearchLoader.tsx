export function ResearchLoader() {
	return (
		<div role="status" aria-live="polite" className="article-loader-shell">
			<div className="article-loader-stack">
				<div className="article-loader-scan">
					<span className="article-loader-scan__crop article-loader-scan__crop--tl" aria-hidden />
					<span className="article-loader-scan__crop article-loader-scan__crop--tr" aria-hidden />
					<span className="article-loader-scan__crop article-loader-scan__crop--bl" aria-hidden />
					<span className="article-loader-scan__crop article-loader-scan__crop--br" aria-hidden />
					<span
						className="article-loader-scan__base"
						aria-hidden
						style={{ backgroundImage: "url('/assets/llama.webp')" }}
					/>
					<span className="article-loader-scan__line" aria-hidden />
				</div>
				<h1 className="article-loader-title">
					<span className="article-loader-title__defillama">DefiLlama</span>{' '}
					<span className="article-loader-title__research">Research</span>
				</h1>
			</div>
			<span className="sr-only">Loading research…</span>
		</div>
	)
}
