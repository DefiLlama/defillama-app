import { tokenIconUrl } from '~/utils/icons'
import { useMetadata } from './api'

// llamaSlugs from /api/odyssey-ecosystem/metadata (protocols[].llamaSlug), used to pull protocol logos.
const ODYSSEY_SLUG = 'odyssey-finance'

function Logo({ slug, alt }: { slug: string; alt: string }) {
	return (
		<img
			src={tokenIconUrl(slug, 32)}
			alt={alt}
			className="size-4 shrink-0 rounded-full bg-(--cards-bg) object-contain"
		/>
	)
}

const debankIcon = (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0">
		<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />
	</svg>
)

interface NavLink {
	label: string
	url: string
	icon: React.ReactNode
}

// Live URLs come from metadata (links.* / debankBundles.*); static URLs are fallbacks until it loads.
function buildLinks(meta: ReturnType<typeof useMetadata>['data']): NavLink[] {
	const links = meta?.links ?? {}
	const debank = meta?.debankBundles ?? {}
	const items: NavLink[] = [
		{
			label: 'Odyssey',
			url: links.odyssey ?? 'https://odyssey.finance',
			icon: <Logo slug={ODYSSEY_SLUG} alt="Odyssey" />
		},
		{
			label: 'Metronome',
			url: links.metronome ?? 'https://metronome.io',
			icon: <Logo slug="metronome-synth" alt="Metronome" />
		},
		{ label: 'Vesper', url: links.vesper ?? 'https://vesper.finance', icon: <Logo slug="vesper" alt="Vesper" /> },
		{ label: 'Metronome Treasury', url: debank.metronome, icon: debankIcon },
		{ label: 'Vesper Treasury', url: debank.vesper, icon: debankIcon }
	]
	return items.filter((l) => Boolean(l.url))
}

export function OdysseyIcon({ className = 'size-7' }: { className?: string }) {
	return (
		<img
			src={tokenIconUrl(ODYSSEY_SLUG, 64)}
			alt="Odyssey Finance"
			className={`${className} rounded-full bg-(--cards-bg) object-contain`}
		/>
	)
}

function OdysseyLogo() {
	return (
		<div className="flex items-center gap-2.5">
			<OdysseyIcon className="size-7 shrink-0" />
			<span className="text-lg font-bold text-(--text-primary)">Odyssey Ecosystem</span>
		</div>
	)
}

export default function OdysseyHeader() {
	const { data: meta } = useMetadata()
	return (
		<header className="flex items-center gap-4 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-4 py-2.5">
			<OdysseyLogo />
			<nav className="ml-auto flex items-center gap-0.5">
				{buildLinks(meta).map(({ label, url, icon }) => (
					<a
						key={label}
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-(--text-secondary) transition-colors hover:bg-(--sl-hover-bg) hover:text-(--text-primary)"
					>
						{icon}
						<span className="hidden lg:inline">{label}</span>
					</a>
				))}
			</nav>
		</header>
	)
}
