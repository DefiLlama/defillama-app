import { tokenIconUrl } from '~/utils/icons'

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
	metronome: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<path d="M12 3v18M5 9l14 12M19 9L5 21" />
		</svg>
	),
	vesper: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<path d="M12 2L4 9l8 13 8-13z" />
		</svg>
	),
	debank: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
			<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />
		</svg>
	)
}

const LINK_LABELS: Record<string, string> = {
	website: 'Odyssey',
	docs: 'Docs',
	metronome: 'Metronome',
	vesper: 'Vesper',
	debank: 'DeBank'
}

const LINKS: Record<string, string> = {
	website: 'https://odyssey.finance',
	docs: 'https://docs.odyssey.finance/',
	metronome: 'https://metronome.io',
	vesper: 'https://vesper.finance',
	debank: 'https://debank.com/profile/0xd44a3e93a256c445f17a12f35a0ffef975ec6817'
}

export function OdysseyIcon({ className = 'h-7 w-7' }: { className?: string }) {
	return (
		<img
			src={tokenIconUrl('odyssey-finance', 64)}
			alt="Odyssey Finance"
			className={`${className} rounded-full bg-(--cards-bg) object-contain`}
		/>
	)
}

function OdysseyLogo() {
	return (
		<div className="flex items-center gap-2.5">
			<OdysseyIcon className="h-7 w-7 shrink-0" />
			<span className="text-lg font-bold text-(--text-primary)">Odyssey Ecosystem</span>
		</div>
	)
}

export default function OdysseyHeader() {
	return (
		<header className="flex items-center gap-4 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-4 py-2.5">
			<OdysseyLogo />
			<nav className="ml-auto flex items-center gap-0.5">
				{Object.entries(LINKS).map(([key, url]) => (
					<a
						key={key}
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-(--text-secondary) transition-colors hover:bg-(--sl-hover-bg) hover:text-(--text-primary)"
					>
						{LINK_ICONS[key]}
						<span className="hidden lg:inline">{LINK_LABELS[key]}</span>
					</a>
				))}
			</nav>
		</header>
	)
}
