import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '~/components/Nav/ThemeSwitch'
import { SEO } from '~/components/SEO'
import { isInvestorsEnabled } from '~/containers/Investors/config'
import { Logo } from '~/containers/Investors/Logo'

function SonicIcon() {
	return (
		<svg
			clipRule="evenodd"
			fillRule="evenodd"
			strokeLinejoin="round"
			strokeMiterlimit="2"
			viewBox="0 0 180 180"
			xmlns="http://www.w3.org/2000/svg"
			className="h-9 w-9 shrink-0"
		>
			<g fill="url(#sonic-brand-a)">
				<path d="m90 7.5c45.533 0 82.5 36.967 82.5 82.5s-36.967 82.5-82.5 82.5-82.5-36.967-82.5-82.5 36.967-82.5 82.5-82.5zm67.861 90.573c-42.086 6.922-71.149 27.287-93.917 53.61 7.993 3.176 16.74 4.927 25.904 4.927 35.031 0 63.956-25.584 68.013-58.537zm-103.98 48.63c12.075-15.367 29.012-28.893 49.34-40.152-20.672 4.701-41.249 16.316-61.074 31.266 3.559 3.355 7.492 6.339 11.734 8.886zm-32.346-50.896c1.014 13.37 6.108 24.893 14.076 34.906 17.787-16.574 41.222-28.705 70.191-35.375l-84.267 0.469zm14.138-46.378c-7.899 9.894-12.908 21.244-14.016 34.446l84.073 0.762c-29.876-7.796-53.229-19.177-70.057-35.208zm122.23 33.03c-3.914-33.105-32.91-58.849-68.051-58.849-9.142 0-17.867 1.742-25.84 4.901 14.887 21.28 57.159 49.575 93.891 53.948zm-103.8-49.075c-4.095 2.439-7.907 5.284-11.373 8.476 13.223 12.708 32.666 23.768 61.418 32.338-20.864-11.522-37.144-25.196-50.045-40.814z" />
			</g>
			<defs>
				<linearGradient
					id="sonic-brand-a"
					x2="1"
					gradientTransform="matrix(164.74 .32312 -.32312 164.74 7.5105 89.933)"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#fac461" offset="0" />
					<stop stopColor="#e3570a" offset=".28" />
					<stop stopColor="#7f6562" offset=".55" />
					<stop stopColor="#3b5d88" offset=".73" />
					<stop stopColor="#203f55" offset="1" />
				</linearGradient>
			</defs>
		</svg>
	)
}

function BerachainIcon() {
	return (
		<svg
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 1441.2 1608"
			fill="currentColor"
			className="h-14 w-14 shrink-0 text-[#F6A623]"
		>
			<path d="M1286.9,687.3c-2.2-7-3.8-14.1-5-21.3c-0.6-3.3-1.2-6.7-1.9-10c-1.6-7.2-3.3-14.3-5.2-21.4v0 c31.5-47.6,181.9-296.1,10.7-455.6c-190-177-412,55-412,55l0.7,1c-99.8-30.3-208-33.9-313.2-1c0,0,0,0,0,0 c-1.3-1.4-222.5-231.5-412-55c-189.5,176.5,15.1,462.1,16.2,463.6c0,0,0,0,0,0c-2.2,6.7-3.9,13.6-5.1,20.5 C139.6,785.4,0,823.1,0,1036s146,388,444,388h122.3c0,0,0,0,0,0c0.5,0.8,50.9,72.1,154.3,72.1c96-0.1,159.3-71.4,159.9-72.1 c0,0,0,0,0,0h116.7c298,0,444-171,444-388C1441.2,837.8,1320.1,791.4,1286.9,687.3L1286.9,687.3z" />
		</svg>
	)
}

function NearIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-14 w-14 shrink-0"
		>
			<path
				d="M13.9017 0.646973C13.3462 0.646973 12.8304 0.929357 12.5394 1.39357L9.40403 5.95741C9.30186 6.10784 9.34331 6.31059 9.49675 6.41075C9.6211 6.49202 9.78561 6.48196 9.89889 6.38645L12.9851 3.76201C13.0364 3.71677 13.1154 3.72137 13.1616 3.77165C13.1825 3.79469 13.1937 3.82444 13.1937 3.85502V12.0719C13.1937 12.1397 13.1377 12.1942 13.0684 12.1942C13.0312 12.1942 12.9962 12.1783 12.9727 12.1502L3.6435 1.20169C3.33966 0.850174 2.89352 0.647392 2.42388 0.646973H2.09782C1.21536 0.646973 0.5 1.34833 0.5 2.2135V13.7863C0.5 14.6515 1.21536 15.3528 2.09782 15.3528C2.65336 15.3528 3.16915 15.0704 3.46017 14.6062L6.59558 10.0424C6.69769 9.89194 6.65624 9.68919 6.50279 9.58903C6.37845 9.50776 6.21394 9.51782 6.10071 9.61334L3.01446 12.2378C2.96318 12.283 2.88412 12.2784 2.83797 12.2281C2.81703 12.2051 2.80592 12.1753 2.80634 12.1447V3.92583C2.80634 3.85796 2.86232 3.80349 2.93155 3.80349C2.96831 3.80349 3.00377 3.81941 3.02728 3.84748L12.3552 14.7981C12.659 15.1496 13.1052 15.3524 13.5749 15.3528H13.9009C14.7833 15.3532 15.4992 14.6523 15.5 13.7871V2.2135C15.5 1.34833 14.7842 0.646973 13.9017 0.646973Z"
				fill="#00EC97"
			/>
		</svg>
	)
}

function SparkBolt() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 497 497" className="h-9 w-9 shrink-0">
			<defs>
				<linearGradient
					id="spark-bolt-grad"
					x1="400.58"
					y1="131.86"
					x2="80.11"
					y2="377.66"
					gradientUnits="userSpaceOnUse"
				>
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

export default function InvestorsPage() {
	if (!isInvestorsEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="DefiLlama" description="Verified metrics powered by DefiLlama" canonicalUrl={null} />
			<div className="investors-dashboard relative col-span-full flex min-h-screen flex-col items-center overflow-hidden bg-(--app-bg) px-6 pt-[12vh] pb-16">
				<ThemeSwitch variant="pill" size="sm" className="absolute top-4 right-4" />
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
					Verified onchain metrics and investor-grade reporting powered by DefiLlama.
				</p>

				<div className="relative mt-12 grid w-full max-w-3xl auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
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
						<BasicLink href="/spark" className="absolute inset-0">
							<span className="sr-only">View Spark Dashboard</span>
						</BasicLink>
					</div>

					<div className="group relative isolate flex flex-col overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg) transition-[border-color,box-shadow] duration-200 hover:border-[#FA43BD]/15 hover:shadow-lg hover:shadow-[#FA43BD]/[0.03]">
						<div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #FA43BD, #FFA930)' }} />
						<div className="flex flex-1 flex-col gap-4 p-5">
							<div className="flex items-center gap-3">
								<SonicIcon />
								<span className="text-lg font-semibold text-(--text-primary)">Sonic</span>
							</div>
							<p className="text-sm leading-relaxed text-(--text-secondary)">
								Fees, ecosystem, vertical integration, and network stats for Sonic
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
						<BasicLink href="/sonic" className="absolute inset-0">
							<span className="sr-only">View Sonic Dashboard</span>
						</BasicLink>
					</div>

					{[
						{ icon: <BerachainIcon />, name: 'Berachain' },
						{ icon: <NearIcon />, name: 'NEAR' }
					].map((item) => (
						<div
							key={item.name}
							className="relative isolate flex flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-(--cards-border) bg-(--cards-bg) p-5 text-center opacity-60"
						>
							{item.icon}
							<span className="mt-3 text-lg font-semibold text-(--text-primary)">{item.name}</span>
							<span className="mt-2 text-xs font-medium tracking-wide text-(--text-tertiary) uppercase">
								Coming Soon
							</span>
						</div>
					))}
				</div>

				<p className="mt-16 text-center text-sm text-(--text-tertiary)">
					Want an investor relations dashboard for your protocol or chain? Contact{' '}
					<a href="mailto:sales@defillama.com" className="text-(--text-secondary) underline">
						sales@defillama.com
					</a>
				</p>
			</div>
		</>
	)
}
