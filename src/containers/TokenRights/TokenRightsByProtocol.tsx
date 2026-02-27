import type { ReactNode } from 'react'
import { CopyHelper } from '~/components/Copy'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import type { IProtocolRaise } from '~/containers/ProtocolOverview/api.types'
import { formattedNum, tokenIconUrl } from '~/utils'
import type { ITokenRightsData, ITokenRightsParsedLink } from './api.types'

interface TokenRightsByProtocolProps {
	name: string
	symbol: string | null
	tokenRightsData: ITokenRightsData
	raises: IProtocolRaise[] | null
}

export function TokenRightsByProtocol({ name, symbol, tokenRightsData, raises }: TokenRightsByProtocolProps) {
	const { overview, governance, decisions, economic, valueAccrual, alignment, resources } = tokenRightsData

	const hasOwnershipContent =
		(raises && raises.length > 0) ||
		alignment.fundraising.length > 0 ||
		alignment.equityRevenueCapture !== null ||
		alignment.associatedEntities.length > 0 ||
		alignment.ipAndBrand !== null ||
		alignment.domain !== null ||
		alignment.equityStatement !== null ||
		alignment.links.length > 0

	return (
		<div className="grid grid-cols-1 gap-2">
			{/* Header */}
			<div className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<TokenLogo logo={tokenIconUrl(name)} size={24} />
				<h1 className="text-xl font-bold">{symbol ? `$${symbol}` : name} Token Rights</h1>
				{overview.lastUpdated ? (
					<span className="ml-auto text-xs text-(--text-secondary)">
						Updated{' '}
						{new Date(overview.lastUpdated).toLocaleDateString(undefined, {
							day: '2-digit',
							month: 'short',
							year: 'numeric'
						})}
					</span>
				) : null}
			</div>

			<div className="grid gap-2 xl:grid-cols-2">
				{/* ── Left column ── */}
				<div className="flex flex-col gap-2">
					{/* Overview */}
					<SectionCard title="Overview">
						<div className="divide-y divide-(--cards-border) empty:hidden">
							{overview.tokens.length > 0 ? (
								<KeyValueRow label="Token(s)">
									<span className="text-right text-sm">{overview.tokens.join(', ')}</span>
								</KeyValueRow>
							) : null}
							{overview.tokenTypes.length > 0 ? (
								<KeyValueRow label="Token Type">
									<PillList items={overview.tokenTypes} />
								</KeyValueRow>
							) : null}
							{overview.utility !== null ? (
								<KeyValueRow label="Utility">
									<span className="text-sm">{overview.utility}</span>
								</KeyValueRow>
							) : null}
						</div>
						<p className="text-sm text-(--text-secondary)">{overview.description}</p>
					</SectionCard>

					{/* Governance & Decisions */}
					<SectionCard title="Governance Rights" badge="Control">
						<p className="text-sm text-(--text-secondary)">{governance.summary}</p>
						<DecisionRow label="Governance Decisions" tokens={governance.decisionTokens} details={governance.details} />
						<DecisionRow
							label="Treasury Decisions"
							tokens={decisions.treasury.tokens}
							details={decisions.treasury.details}
						/>
						<DecisionRow
							label="Revenue Decisions"
							tokens={decisions.revenue.tokens}
							details={decisions.revenue.details}
						/>
						<FeeSwitchRow status={economic.feeSwitchStatus} details={economic.feeSwitchDetails} />
						<InlineLinks links={governance.links} />
					</SectionCard>

					{/* Resources */}
					{resources.addresses.length > 0 || resources.reports.length > 0 ? (
						<SectionCard title="Resources">
							{resources.addresses.map((a, i) => (
								<div key={`${a.value}-${i}`} className="flex items-center justify-between gap-4">
									<div className="flex min-w-0 flex-col gap-0.5">
										{a.label ? <span className="text-sm">{a.label}</span> : null}
										<span className="truncate font-mono text-xs text-(--text-secondary)">{a.value}</span>
									</div>
									<CopyHelper toCopy={a.value} />
								</div>
							))}
							{resources.reports.map((r) => (
								<div key={r.url} className="flex items-center justify-between gap-4">
									<span className="text-sm">{r.label}</span>
									<a
										href={r.url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex shrink-0 items-center gap-1 text-sm text-blue-500 hover:underline"
									>
										{tryHostname(r.url)}
										<Icon name="external-link" className="h-3.5 w-3.5" />
									</a>
								</div>
							))}
						</SectionCard>
					) : null}
				</div>

				{/* ── Right column ── */}
				<div className="flex flex-col gap-2">
					{/* Economic Rights & Value Accrual */}
					<SectionCard title="Economic Rights" badge="Value Capture">
						{economic.summary !== null ? <p className="text-sm text-(--text-secondary)">{economic.summary}</p> : null}
						<TokenActionRow
							label="Buybacks"
							tokens={valueAccrual.buybacks.tokens}
							details={valueAccrual.buybacks.details}
						/>
						<TokenActionRow
							label="Dividends"
							tokens={valueAccrual.dividends.tokens}
							details={valueAccrual.dividends.details}
						/>
						<BurnsRow status={valueAccrual.burns.status} details={valueAccrual.burns.details} />
						{valueAccrual.primary !== null || valueAccrual.details !== null ? (
							<QuotedBlock title="Primary Value Accrual">
								{valueAccrual.primary !== null ? (
									<span className="text-sm font-semibold">{valueAccrual.primary}</span>
								) : null}
								{valueAccrual.details !== null ? (
									<p className="text-sm text-(--text-secondary)">{valueAccrual.details}</p>
								) : null}
							</QuotedBlock>
						) : null}
						<InlineLinks links={economic.links} />
					</SectionCard>

					{/* Ownership */}
					{hasOwnershipContent ? (
						<SectionCard title="Ownership">
							{raises && raises.length > 0 ? <RaiseHistorySection raises={raises} /> : null}
							<div className="divide-y divide-(--cards-border) empty:hidden">
								{alignment.fundraising.length > 0 ? (
									<KeyValueRow label="Fundraising">
										<PillList items={alignment.fundraising} />
									</KeyValueRow>
								) : null}
								{alignment.equityRevenueCapture !== null ? (
									<KeyValueRow label="Equity Revenue Capture">
										<StatusBadge
											label={alignment.equityRevenueCapture}
											tone={equityCaptureTone(alignment.equityRevenueCapture)}
										/>
									</KeyValueRow>
								) : null}
								{alignment.associatedEntities.length > 0 ? (
									<KeyValueRow label="Associated Entities">
										<PillList items={alignment.associatedEntities} />
									</KeyValueRow>
								) : null}
								{alignment.ipAndBrand !== null ? (
									<KeyValueRow label="IP & Brand">
										<span className="text-right text-sm">{alignment.ipAndBrand}</span>
									</KeyValueRow>
								) : null}
								{alignment.domain !== null ? (
									<KeyValueRow label="Domain">
										<span className="text-right text-sm">{alignment.domain}</span>
									</KeyValueRow>
								) : null}
							</div>
							{alignment.equityStatement !== null ? (
								<QuotedBlock title="Equity Statement">
									<p className="text-sm text-(--text-secondary)">{alignment.equityStatement}</p>
								</QuotedBlock>
							) : null}
							<InlineLinks links={alignment.links} />
						</SectionCard>
					) : null}
				</div>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

type StatusTone = 'positive' | 'negative' | 'warning' | 'neutral'

function toneClasses(tone: StatusTone) {
	switch (tone) {
		case 'positive':
			return 'border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400'
		case 'negative':
			return 'border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400'
		case 'warning':
			return 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400'
		default:
			return 'border-(--cards-border) bg-(--cards-bg) text-(--text-secondary)'
	}
}

function SectionCard({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold">{title}</h2>
				{badge ? (
					<span className="text-xs font-medium tracking-wider text-(--text-secondary) uppercase">{badge}</span>
				) : null}
			</div>
			{children}
		</div>
	)
}

function KeyValueRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<span className="shrink-0 text-sm text-(--text-secondary)">{label}</span>
			<div className="flex flex-wrap items-center justify-end gap-1.5">{children}</div>
		</div>
	)
}

function PillList({ items }: { items: string[] }) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{items.map((item, index) => (
				<span
					key={`${item}-${index}`}
					className="rounded-full border border-(--cards-border) bg-(--app-bg) px-2.5 py-0.5 text-sm"
				>
					{item}
				</span>
			))}
		</div>
	)
}

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
	return (
		<span
			className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium ${toneClasses(tone)}`}
		>
			{label}
		</span>
	)
}

function InlineLinks({ links }: { links: ITokenRightsParsedLink[] }) {
	if (links.length === 0) return null
	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
			{links.map((l) => (
				<a
					key={l.url}
					href={l.url}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
				>
					<Icon name="external-link" className="h-3 w-3 shrink-0" />
					<span>{l.label}</span>
				</a>
			))}
		</div>
	)
}

function QuotedBlock({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1.5 rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
			<span className="text-xs font-medium tracking-wider text-(--text-label) uppercase">{title}</span>
			{children}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Domain-specific rows
// ---------------------------------------------------------------------------

function isNATokens(tokens: string[]): boolean {
	return tokens.length === 1 && tokens[0] === 'N/A'
}

function DecisionRow({ label, tokens, details }: { label: string; tokens: string[]; details: string | null }) {
	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-sm font-semibold">{label}</span>
				<PillList items={tokens} />
			</div>
			{details !== null ? <p className="text-sm text-(--text-secondary)">{details}</p> : null}
		</div>
	)
}

function TokenActionRow({ label, tokens, details }: { label: string; tokens: string[]; details: string | null }) {
	const isNA = isNATokens(tokens)
	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-sm font-semibold">{label}</span>
				{isNA ? <StatusBadge label="N/A" tone="neutral" /> : <PillList items={tokens} />}
			</div>
			{details !== null ? <p className="text-sm text-(--text-secondary)">{details}</p> : null}
		</div>
	)
}

function BurnsRow({ status, details }: { status: string; details: string | null }) {
	const tone: StatusTone = status === 'Active' ? 'positive' : 'neutral'
	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-semibold">Burns</span>
				<StatusBadge label={status} tone={tone} />
			</div>
			{details !== null ? <p className="text-sm text-(--text-secondary)">{details}</p> : null}
		</div>
	)
}

function FeeSwitchRow({ status, details }: { status: string; details: string | null }) {
	const tone = feeSwitchTone(status)
	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-semibold">Fee Switch</span>
				<StatusBadge label={status} tone={tone} />
			</div>
			{details !== null ? <p className="text-sm text-(--text-secondary)">{details}</p> : null}
		</div>
	)
}

function RaiseHistorySection({ raises }: { raises: IProtocolRaise[] }) {
	const totalAmount = raises.reduce((sum, r) => sum + (r.amount || 0), 0)

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold">Raise History</span>
				<span className="text-xs text-(--text-secondary)">
					{raises.length} round{raises.length !== 1 ? 's' : ''} · {formattedNum(totalAmount * 1_000_000, true)} total
				</span>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b border-(--cards-border) text-xs font-medium tracking-wider text-(--text-label) uppercase">
							<th className="pr-4 pb-2">Date</th>
							<th className="pr-4 pb-2 text-right">Amount</th>
							<th className="pr-4 pb-2">Round</th>
							<th className="pr-4 pb-2">Lead Investor</th>
							<th className="pr-4 pb-2 text-right">Valuation</th>
							<th className="w-8 pb-2" />
						</tr>
					</thead>
					<tbody>
						{raises.map((r, i) => (
							<tr key={`${r.date}-${r.round}-${i}`} className="border-b border-(--cards-border) last:border-0">
								<td className="py-2 pr-4 whitespace-nowrap">
									{r.date
										? new Date(r.date * 1000).toLocaleDateString(undefined, {
												day: '2-digit',
												month: 'short',
												year: 'numeric'
											})
										: '—'}
								</td>
								<td className="py-2 pr-4 text-right font-jetbrains whitespace-nowrap tabular-nums">
									{r.amount ? formattedNum(r.amount * 1_000_000, true) : '—'}
								</td>
								<td className="py-2 pr-4 whitespace-nowrap">{r.round || '—'}</td>
								<td className="py-2 pr-4 whitespace-nowrap">{r.leadInvestors?.join(', ') || '—'}</td>
								<td className="py-2 pr-4 text-right whitespace-nowrap">{r.valuation || '—'}</td>
								<td className="py-2">
									{r.source ? (
										<a
											href={r.source}
											target="_blank"
											rel="noopener noreferrer"
											className="text-(--text-secondary) hover:text-(--text-primary)"
										>
											<Icon name="external-link" className="h-3.5 w-3.5" />
										</a>
									) : null}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tryHostname(url: string): string {
	try {
		return new URL(url).hostname
	} catch {
		return url
	}
}

function feeSwitchTone(status: string): StatusTone {
	switch (status) {
		case 'ON':
			return 'positive'
		case 'PENDING':
			return 'warning'
		case 'OFF':
			return 'negative'
		default:
			return 'neutral'
	}
}

function equityCaptureTone(val: string): StatusTone {
	switch (val) {
		case 'Yes':
			return 'negative'
		case 'Partial':
			return 'warning'
		case 'No':
			return 'positive'
		default:
			return 'neutral'
	}
}
