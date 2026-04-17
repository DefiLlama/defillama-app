import type { ReactNode } from 'react'

type StatusTone = 'ready' | 'busy' | 'error' | 'muted'

const TONE_CLASS: Record<StatusTone, string> = {
	ready: 'bg-pro-green-300',
	busy: 'bg-pro-gold-300',
	error: 'bg-red-500',
	muted: 'bg-(--text-tertiary)/60'
}

export function StatusDot({ tone, blink = false }: { tone: StatusTone; blink?: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={`relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${TONE_CLASS[tone]}`}
		>
			{blink ? (
				<span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${TONE_CLASS[tone]}`} />
			) : null}
		</span>
	)
}

export function Keycap({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
	return (
		<kbd
			className={`inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-[3px] border px-[3px] font-mono text-[10px] leading-none tabular-nums ${
				muted
					? 'border-white/20 bg-white/10 text-white/85'
					: 'border-(--divider) bg-(--app-bg) text-(--text-secondary) shadow-[inset_0_-1px_0_var(--divider)]'
			}`}
		>
			{children}
		</kbd>
	)
}

export function SectionLabel({
	label,
	count,
	action
}: {
	label: string
	count?: string | number
	action?: ReactNode
}) {
	return (
		<div className="flex items-baseline justify-between gap-2">
			<div className="flex items-baseline gap-2">
				<h3 className="text-xs font-semibold tracking-tight text-(--text-primary)">{label}</h3>
				{count !== undefined ? (
					<span className="text-[11px] tabular-nums text-(--text-tertiary)">{count}</span>
				) : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	)
}

type ColumnKind = 'date' | 'int' | 'float' | 'text' | 'bool' | 'other'

const KIND_LABEL: Record<ColumnKind, string> = {
	date: 'date',
	int: 'int',
	float: 'num',
	text: 'text',
	bool: 'bool',
	other: '—'
}

const KIND_TONE: Record<ColumnKind, string> = {
	date: 'text-pro-gold-300',
	int: 'text-(--primary)',
	float: 'text-(--primary)',
	text: 'text-pro-green-300',
	bool: 'text-pro-purple-300',
	other: 'text-(--text-tertiary)'
}

export function TypeBadge({ kind }: { kind: ColumnKind }) {
	return (
		<span
			aria-label={`${kind} column`}
			className={`inline-flex h-[14px] shrink-0 items-center rounded-[3px] bg-(--app-bg)/60 px-1 font-mono text-[9px] leading-none tracking-tight ${KIND_TONE[kind]}`}
		>
			{KIND_LABEL[kind]}
		</span>
	)
}

export function inferColumnKind(typeString: string | undefined): ColumnKind {
	if (!typeString) return 'other'
	if (/Date|Timestamp/i.test(typeString)) return 'date'
	if (/Float|Decimal|Double/i.test(typeString)) return 'float'
	if (/Int|Long|Short/i.test(typeString)) return 'int'
	if (/Bool/i.test(typeString)) return 'bool'
	if (/Utf8|String/i.test(typeString)) return 'text'
	return 'other'
}

export type { ColumnKind }
