import { Icon } from '~/components/Icon'

export type DownloadsMode = 'simple' | 'sql'

interface ModeToggleProps {
	mode: DownloadsMode
	onChange: (next: DownloadsMode) => void
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
	return (
		<div
			role="tablist"
			aria-label="Downloads mode"
			className="inline-flex items-center gap-0.5 rounded-md border border-(--divider) bg-(--cards-bg) p-0.5"
		>
			<ModeButton active={mode === 'simple'} label="Simple" icon="download-cloud" onClick={() => onChange('simple')} />
			<ModeButton active={mode === 'sql'} label="SQL" icon="code" onClick={() => onChange('sql')} badge="BETA" />
		</div>
	)
}

function ModeButton({
	active,
	label,
	icon,
	onClick,
	badge
}: {
	active: boolean
	label: string
	icon: 'download-cloud' | 'code'
	onClick: () => void
	badge?: string
}) {
	return (
		<button
			role="tab"
			type="button"
			aria-selected={active}
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
				active
					? 'bg-(--primary) text-white shadow-sm'
					: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
			}`}
		>
			<Icon name={icon} className="h-3 w-3" />
			{label}
			{badge ? (
				<span
					className={`rounded-sm px-1 py-px text-[9px] font-semibold tracking-wide ${
						active ? 'bg-white/20 text-white' : 'bg-(--primary)/15 text-(--primary)'
					}`}
				>
					{badge}
				</span>
			) : null}
		</button>
	)
}
