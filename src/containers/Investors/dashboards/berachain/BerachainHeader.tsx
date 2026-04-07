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
	explorer: 'Explorer'
}

function BerachainIcon({ className = 'h-9 w-9' }: { className?: string }) {
	return (
		<svg
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 3238.5 1608"
			fill="currentColor"
			className={className}
		>
			<path d="M1286.9,687.3c-2.2-7-3.8-14.1-5-21.3c-0.6-3.3-1.2-6.7-1.9-10c-1.6-7.2-3.3-14.3-5.2-21.4v0 c31.5-47.6,181.9-296.1,10.7-455.6c-190-177-412,55-412,55l0.7,1c-99.8-30.3-208-33.9-313.2-1c0,0,0,0,0,0 c-1.3-1.4-222.5-231.5-412-55c-189.5,176.5,15.1,462.1,16.2,463.6c0,0,0,0,0,0c-2.2,6.7-3.9,13.6-5.1,20.5 C139.6,785.4,0,823.1,0,1036s146,388,444,388h122.3c0,0,0,0,0,0c0.5,0.8,50.9,72.1,154.3,72.1c96-0.1,159.3-71.4,159.9-72.1 c0,0,0,0,0,0h116.7c298,0,444-171,444-388C1441.2,837.8,1320.1,791.4,1286.9,687.3L1286.9,687.3z" />
			<path d="M3223.3,377c0,0,25.2-233.3-166.4-283.4V0h-148.3v91.2l0,0c-202.1,44.7-176,285.8-176,285.8v40 c0,0-26.1,241.1,176.1,285.8h0v200.3c-213,38.8-186.1,287.8-186.1,287.8v40c0,0-26.1,241.1,176,285.8l0,0v91.2H3047v-93.6 c191.6-50.1,166.4-283.4,166.4-283.4c8.4,0,15.2-6.8,15.2-15.2v-9.7c0-8.4-6.8-15.2-15.2-15.2c0,0,25-231.3-163.9-282.8l0,0V702.8 h-2.2c202.1-44.7,176.1-285.8,176.1-285.8c8.4,0,15.2-6.8,15.2-15.2v-9.7C3238.5,383.8,3231.7,377,3223.3,377L3223.3,377z M3102.4,1190.8h-13.6c-8.4,0-15.2,6.8-15.2,15.2v9.7c0,8.4,6.8,15.2,15.2,15.2h13.6c0,144.7-48.1,169.1-64.2,173.2 c-2.7,0.7-5.2-1.3-5.2-4v-46.1c0-25.5-16.2-39.5-32.5-47.1c-20.5-9.6-44.5-9.6-65,0c-16.2,7.6-32.5,21.6-32.5,47.1v46.1 c0,2.7-2.5,4.7-5.1,4.1c-16.1-4-64.3-28.2-64.3-173.2v-40c0-144.7,48.1-169.1,64.2-173.2c2.7-0.7,5.2,1.3,5.2,4v46.1 c0,25.5,16.2,39.5,32.5,47.1c20.5,9.6,44.5,9.6,65,0c16.2-7.6,32.5-21.6,32.5-47.1v-46.1c0-2.7,2.5-4.7,5.1-4.1 C3054.2,1021.7,3102.4,1045.9,3102.4,1190.8L3102.4,1190.8z M3098.9,417h13.6c0,145-48.2,169.2-64.3,173.2 c-2.6,0.7-5.1-1.4-5.1-4.1V540c0-25.5-16.2-39.5-32.5-47.1c-20.5-9.6-44.5-9.6-65,0c-16.2,7.6-32.5,21.6-32.5,47.1v46.1 c0,2.7-2.6,4.7-5.2,4c-16.2-4.1-64.2-28.5-64.2-173.2v-40c0-145,48.2-169.2,64.3-173.2c2.6-0.7,5.1,1.4,5.1,4.1V254 c0,25.5,16.2,39.5,32.5,47.1c20.5,9.6,44.5,9.6,65,0c16.2-7.6,32.5-21.6,32.5-47.1v-46.1c0-2.7,2.6-4.7,5.2-4 c16.2,4.1,64.2,28.4,64.2,173.2h-13.6c-8.4,0-15.2,6.8-15.2,15.2v9.7C3083.7,410.2,3090.5,417,3098.9,417z" />
			<path d="M2490.3,789c0,0,26.2-242.5-177.8-286.1V285c198.6-46.5,172.8-285,172.8-285S2374,0,2374.4,0 c0,145-48.2,169.2-64.3,173.2c-2.6,0.7-5.1-1.4-5.1-4.1V123c0-25.5-16.2-39.5-32.5-47.1c-20.5-9.6-44.5-9.6-65,0 c-16.2,7.6-32.5,21.6-32.5,47.1v46.1c0,2.7-2.6,4.7-5.2,4c-16.2-4.1-64.2-28.4-64.2-173.2c0.5,0-110.9,0-110.9,0 s-26.7,247.5,184.2,287.4v215.1C1973.3,545.4,1999.6,789,1999.6,789v40c0,0-26.3,243.6,179.2,286.4v205.1 c-210.9,39.9-184.2,287.4-184.2,287.4s111.3,0,110.9,0c0-145,48.2-169.2,64.3-173.2c2.6-0.7,5.1,1.4,5.1,4.1v46.1 c0,25.5,16.2,39.5,32.5,47.1c20.5,9.6,44.5,9.6,65,0c16.2-7.6,32.5-21.6,32.5-47.1v-46.1c0-2.7,2.6-4.7,5.2-4 c16.2,4.1,64.2,28.4,64.2,173.2c-0.5,0,110.9,0,110.9,0s25.8-238.5-172.8-285v-207.8c204-43.7,177.8-286.1,177.8-286.1 c8.4,0,15.2-6.8,15.2-15.2v-9.7C2505.5,795.8,2498.7,789,2490.3,789L2490.3,789z M2365.9,829h13.6c0,145-48.2,169.2-64.3,173.2 c-2.6,0.7-5.1-1.4-5.1-4.1V952c0-25.5-16.2-39.5-32.5-47.1c-20.5-9.6-44.5-9.6-65,0c-16.2,7.6-32.5,21.6-32.5,47.1v46.1 c0,2.7-2.6,4.7-5.2,4c-16.2-4.1-64.2-28.5-64.2-173.2v-40c0-145,48.2-169.2,64.3-173.2c2.6-0.7,5.1,1.4,5.1,4.1V666 c0,25.5,16.2,39.5,32.5,47.1c20.5,9.6,44.5,9.6,65,0c16.2-7.6,32.5-21.6,32.5-47.1v-46.1c0-2.7,2.6-4.7,5.2-4 c16.2,4.1,64.2,28.5,64.2,173.2h-13.6c-8.4,0-15.2,6.8-15.2,15.2v9.7C2350.7,822.2,2357.5,829,2365.9,829L2365.9,829z" />
		</svg>
	)
}

function BerachainLogo() {
	return (
		<div className="flex items-center gap-2.5">
			<BerachainIcon className="h-9 w-9 shrink-0" />
			<span className="text-lg font-bold text-(--text-primary)">Berachain</span>
		</div>
	)
}

const LINKS: Record<string, string> = {
	website: 'https://berachain.com',
	docs: 'https://docs.berachain.com',
	x: 'https://x.com/berachain',
	explorer: 'https://berascan.com'
}

export default function BerachainHeader() {
	return (
		<header className="flex items-center gap-4 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-4 py-2.5">
			<BerachainLogo />
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
					href="https://hub.berachain.com"
					target="_blank"
					rel="noopener noreferrer"
					className="ml-1 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85"
					style={{ background: '#F6A623' }}
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
