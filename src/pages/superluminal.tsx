import { SEO } from '~/components/SEO'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { isSuperLuminalEnabled } from '~/containers/SuperLuminal/config'
import { Logo } from '~/containers/SuperLuminal/Logo'

function SparkBolt() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 497 497" className="h-9 w-9 shrink-0">
			<defs>
				<linearGradient id="spark-bolt-grad" x1="400.58" y1="131.86" x2="80.11" y2="377.66" gradientUnits="userSpaceOnUse">
					<stop stopColor="#FA43BD" />
					<stop offset="1" stopColor="#FFA930" />
				</linearGradient>
			</defs>
			<path
				fill="url(#spark-bolt-grad)"
				d="M313.035 279.197h177.982c6.846 0 8.225-9.321 2-12.168L313.046 185.06V6.383c0-6.67-8.92-8.858-11.998-2.941l-73.988 142.459-81.987-37.656c-7.844-3.168-12.661 3.219-9.999 8.708l48.891 100.85H5.983c-6.846 0-8.225 9.321-2 12.168l179.971 81.97v178.677c0 6.669 8.92 8.857 11.998 2.941l73.988-142.46 81.987 37.656c7.844 3.168 12.661-3.218 9.999-8.708l-48.891-100.85Z"
			/>
		</svg>
	)
}

export default function SuperLuminalPage() {
	if (!isSuperLuminalEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="DefiLlama" description="Verified metrics powered by DefiLlama" canonicalUrl={null} />
			<div className="superluminal-dashboard relative col-span-full flex min-h-screen flex-col items-center bg-(--app-bg) px-6 pt-[12vh] pb-16">
				{/* Ambient glow */}
				<div
					className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2"
					style={{
						background:
							'radial-gradient(50% 50% at 50% 40%, rgba(250,67,189,0.06) 0%, rgba(255,169,48,0.03) 40%, transparent 70%)'
					}}
				/>
				{/* Fine cross grid */}
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						backgroundImage:
							'linear-gradient(var(--cards-border) 1px, transparent 1px), linear-gradient(90deg, var(--cards-border) 1px, transparent 1px)',
						backgroundSize: '48px 48px',
						maskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, black 0%, transparent 100%)',
						WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, black 0%, transparent 100%)'
					}}
				/>
				<Logo />
				<p className="mt-3 text-center text-sm text-(--text-secondary)">
					Verified on-chain metrics and investor-grade reporting powered by DefiLlama.
				</p>

				<div className="relative mt-12 grid w-full max-w-2xl grid-cols-1 gap-5 md:grid-cols-2">
					{/* Spark Dashboard Card */}
					<div className="group relative isolate flex flex-col overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg) transition-[border-color,box-shadow] duration-200 hover:border-[#FA43BD]/15 hover:shadow-lg hover:shadow-[#FA43BD]/[0.03]">
						<div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #FA43BD, #FFA930)' }} />
						<div className="flex flex-1 flex-col gap-4 p-5">
							<div className="flex items-center gap-3">
								<SparkBolt />
								<span className="text-lg font-semibold text-(--text-primary)">Spark</span>
							</div>
							<p className="text-sm leading-relaxed text-(--text-secondary)">
								Financials, protocol overview, distribution rewards, and reports for the Spark ecosystem.
							</p>
							<div className="flex flex-wrap gap-1.5">
								{['Financials', 'Lending', 'Rewards', 'Reports'].map((tag) => (
									<span
										key={tag}
										className="rounded-full bg-(--sl-accent-muted) px-2.5 py-0.5 text-[11px] font-medium text-(--sl-accent)"
									>
										{tag}
									</span>
								))}
							</div>
							<div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-(--sl-accent)">
								View Dashboard
								<Icon name="arrow-right" className="h-3.5 w-3.5" />
							</div>
						</div>
						<BasicLink href="/superluminal/spark" className="absolute inset-0">
							<span className="sr-only">View Spark Dashboard</span>
						</BasicLink>
					</div>

					{/* Coming Soon Placeholder */}
					<div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-(--cards-border) bg-(--cards-bg) p-5 text-center">
						<Icon name="layout-grid" className="h-8 w-8 text-(--text-tertiary)" />
						<span className="mt-3 text-sm font-medium text-(--text-secondary)">More dashboards coming soon</span>
						<p className="mt-1 text-xs text-(--text-tertiary)">
							Investor-grade reporting for additional protocols.
						</p>
					</div>
				</div>
			</div>
		</>
	)
}
