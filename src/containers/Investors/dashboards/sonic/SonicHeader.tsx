const LINK_ICONS: Record<string, React.ReactNode> = {
	website: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
		</svg>
	),
	docs: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	),
	x: (
		<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	),
	feem: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<circle cx="12" cy="12" r="10" />
			<path d="M12 6v12M8 10h8M8 14h6" />
		</svg>
	),
	explorer: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<circle cx="11" cy="11" r="8" />
			<path d="M21 21l-4.35-4.35" />
		</svg>
	)
}

const LINK_LABELS: Record<string, string> = {
	website: 'Website',
	docs: 'Docs',
	x: 'X',
	feem: 'FeeM',
	explorer: 'Explorer'
}

export function SonicIcon({ className = 'h-7 w-7' }: { className?: string }) {
	return (
		<svg
			clipRule="evenodd"
			fillRule="evenodd"
			strokeLinejoin="round"
			strokeMiterlimit="2"
			viewBox="0 0 180 180"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
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

function SonicLogo() {
	return (
		<div className="flex items-center gap-2.5">
			<SonicIcon className="h-7 w-7 shrink-0" />
			<span className="text-lg font-bold text-(--text-primary)">Sonic</span>
		</div>
	)
}

const LINKS: Record<string, string> = {
	website: 'https://soniclabs.com',
	docs: 'https://docs.soniclabs.com',
	x: 'https://x.com/SonicLabs',
	feem: 'https://feem.soniclabs.com/',
	explorer: 'https://sonicscan.org'
}

export default function SonicHeader() {
	return (
		<header className="flex items-center gap-4 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-4 py-2.5">
			<SonicLogo />
			<nav className="ml-auto flex items-center gap-0.5">
				{Object.entries(LINKS).map(([key, url]) => (
					<a
						key={key}
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className={`items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-(--text-secondary) transition-colors hover:bg-(--sl-hover-bg) hover:text-(--text-primary) ${
							key === 'website' ? 'flex' : 'hidden sm:flex'
						}`}
					>
						{LINK_ICONS[key]}
						<span className="hidden lg:inline">{LINK_LABELS[key]}</span>
					</a>
				))}
				<a
					href="https://soniclabs.com"
					target="_blank"
					rel="noopener noreferrer"
					className="ml-1 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
					style={{ background: 'linear-gradient(135deg, #1E90FF, #00BFFF)' }}
				>
					Launch App
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
						<path d="M7 17L17 7M17 7H7M17 7v10" />
					</svg>
				</a>
			</nav>
		</header>
	)
}
