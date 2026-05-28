const LINK_ICONS: Record<string, React.ReactNode> = {
	website: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
		</svg>
	),
	data: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<path d="M18 20V10M12 20V4M6 20v-6" />
		</svg>
	),
	docs: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	),
	forum: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
	),
	x: (
		<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	),
	discord: (
		<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
			<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
		</svg>
	)
}

const LINK_LABELS: Record<string, string> = {
	website: 'Website',
	data: 'Data',
	docs: 'Docs',
	forum: 'Forum',
	x: 'X',
	discord: 'Discord'
}

function SparkLogo() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 106 32"
			fill="none"
			className="h-7 shrink-0"
			style={{ width: 'auto', minWidth: 92 }}
		>
			<path
				fill="url(#spark-logo-grad)"
				d="M17.316 16.61h9.193c.358 0 .464-.497.139-.648l-9.334-4.359v-9.55c0-.355-.467-.472-.628-.156l-3.874 7.604L8.486 7.49c-.287-.133-.578.178-.434.465l2.703 5.381H1.56c-.358 0-.464.497-.138.65l9.333 4.359v9.548c0 .356.468.473.629.157l3.873-7.604 4.32 2.016c.287.134.578-.177.434-.464l-2.696-5.386Z"
			/>
			<path
				fill="currentColor"
				d="M60.455 17.744c0 2.863-1.639 5.094-4.443 5.094-2.877 0-4.443-2.157-4.443-5.095 0-2.974 1.675-5.131 4.443-5.131 2.804 0 4.443 2.268 4.443 5.132Zm2.804 0c0-4.314-2.476-7.623-6.846-7.623-1.821 0-3.678.818-4.625 2.417v-2.194H49.02v20.712h2.768v-8.032c.874 1.561 2.658 2.305 4.48 2.305 4.551 0 6.991-3.42 6.991-7.585Zm33.534.297 5.171 7.065h3.46l-6.628-8.999 6.082-5.763h-3.606l-6.3 5.912V4.171h-2.804v20.935h2.804v-5.355l1.821-1.71Zm-20.177-.297c0 2.788-1.493 5.094-4.442 5.094-2.877 0-4.443-2.157-4.443-5.095 0-2.9 1.602-5.131 4.443-5.131 2.658 0 4.442 2.008 4.442 5.132Zm-.218-7.4v1.97c-1.02-1.375-2.84-2.194-4.552-2.194-4.26 0-6.92 3.087-6.92 7.624 0 4.425 2.55 7.585 6.956 7.585 1.748 0 3.787-.744 4.516-2.23v2.007h2.767V10.344h-2.767Zm10.053.669c-.619.483-1.092 1.19-1.42 2.194v-2.863h-2.768v14.762h2.768V18.45c0-1.785.291-3.16.801-4.128.546-1.004 1.457-1.524 2.695-1.524h2.112v-2.454H88.89c-1.02 0-1.82.223-2.44.669Zm-39.834 8.515c0-4.239-3.095-5.206-6.628-6.21-1.93-.446-4.807-1.04-4.807-3.458 0-2.008 2.076-2.789 4.079-2.789 2.258 0 4.042 1.302 4.297 3.607h2.913c-.182-3.83-3.132-6.284-7.174-6.284-3.569 0-7.064 1.785-7.137 5.429 0 4.053 3.059 5.132 6.591 6.098 1.675.484 4.916 1.265 4.916 3.645 0 2.23-2.33 3.086-4.515 3.086-2.695 0-4.516-1.673-4.698-4.425h-2.986c.145 4.053 2.804 7.102 7.647 7.102 3.824 0 7.502-1.599 7.502-5.8Z"
			/>
			<defs>
				<linearGradient
					id="spark-logo-grad"
					x1="20.815"
					x2="4.893"
					y1="9.447"
					y2="21.239"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#FA43BD" />
					<stop offset="1" stopColor="#FFA930" />
				</linearGradient>
			</defs>
		</svg>
	)
}

const LINKS: Record<string, string> = {
	website: 'https://spark.fi',
	data: 'https://data.spark.fi',
	docs: 'https://docs.spark.fi',
	forum: 'https://forum.sky.money/c/spark-subdao/84',
	x: 'https://x.com/sparkdotfi',
	discord: 'https://discord.gg/sparkdotfi'
}

export default function SparkHeader() {
	return (
		<header className="flex items-center gap-4 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-4 py-2.5">
			<SparkLogo />
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
					href="https://app.spark.fi"
					target="_blank"
					rel="noopener noreferrer"
					className="ml-1 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
					style={{ background: 'linear-gradient(135deg, #FA43BD, #FFA930)' }}
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
