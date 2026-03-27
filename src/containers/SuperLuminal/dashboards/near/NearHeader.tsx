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
	github: (
		<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
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
	github: 'GitHub',
	explorer: 'Explorer'
}

export function NearIcon({ className = 'h-7 w-7' }: { className?: string }) {
	return (
		<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
			<path
				d="M65.6641 18.75L51.3281 41.25L50.625 54.375L58.7109 41.25L65.6641 18.75Z"
				fill="url(#near-gradient-1)"
			/>
			<path
				d="M24.3359 71.25L38.6719 48.75L39.375 35.625L31.2891 48.75L24.3359 71.25Z"
				fill="url(#near-gradient-2)"
			/>
			<path
				d="M65.6641 18.75C64.0547 16.0547 61.5234 14.0625 58.0078 14.0625C53.8594 14.0625 50.625 17.2969 50.625 21.4453V54.375L58.7109 41.25L65.6641 18.75Z"
				fill="url(#near-gradient-3)"
			/>
			<path
				d="M24.3359 71.25C25.9453 73.9453 28.4766 75.9375 31.9922 75.9375C36.1406 75.9375 39.375 72.7031 39.375 68.5547V35.625L31.2891 48.75L24.3359 71.25Z"
				fill="url(#near-gradient-4)"
			/>
			<defs>
				<linearGradient id="near-gradient-1" x1="58.2891" y1="18.75" x2="58.2891" y2="54.375" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C1DE" />
					<stop offset="1" stopColor="#00C1DE" stopOpacity="0" />
				</linearGradient>
				<linearGradient id="near-gradient-2" x1="31.7109" y1="71.25" x2="31.7109" y2="35.625" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C1DE" />
					<stop offset="1" stopColor="#00C1DE" stopOpacity="0" />
				</linearGradient>
				<linearGradient id="near-gradient-3" x1="51.6797" y1="14.0625" x2="63.7734" y2="42.8906" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00E4AA" />
					<stop offset="1" stopColor="#00C1DE" />
				</linearGradient>
				<linearGradient id="near-gradient-4" x1="38.3203" y1="75.9375" x2="26.2266" y2="47.1094" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00E4AA" />
					<stop offset="1" stopColor="#00C1DE" />
				</linearGradient>
			</defs>
		</svg>
	)
}

function NearLogo() {
	return (
		<div className="flex items-center gap-2.5">
			<NearIcon className="h-7 w-7 shrink-0" />
			<span className="text-lg font-bold text-(--text-primary)">NEAR Protocol</span>
		</div>
	)
}

const LINKS: Record<string, string> = {
	website: 'https://near.org',
	docs: 'https://docs.near.org',
	x: 'https://x.com/nearprotocol',
	github: 'https://github.com/near',
	explorer: 'https://nearblocks.io'
}

export default function NearHeader() {
	return (
		<header className="flex items-center gap-4 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-4 py-2.5">
			<NearLogo />
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
					href="https://near.org"
					target="_blank"
					rel="noopener noreferrer"
					className="ml-1 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
					style={{ background: 'linear-gradient(135deg, #00C1DE, #00E4AA)' }}
				>
					Learn More
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
						<path d="M7 17L17 7M17 7H7M17 7v10" />
					</svg>
				</a>
			</nav>
		</header>
	)
}
