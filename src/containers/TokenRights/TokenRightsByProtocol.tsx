import type { ReactNode } from 'react'
import { CopyHelper } from '~/components/Copy'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import type { IProtocolRaise } from '~/containers/ProtocolOverview/api.types'
import { formattedNum, tokenIconUrl } from '~/utils'
import type { ITokenRightsData, ITokenRightsParsedAddress, ITokenRightsParsedLink } from './api.types'

interface TokenRightsByProtocolProps {
	name: string
	symbol: string | null
	tokenRightsData: ITokenRightsData
	raises: IProtocolRaise[] | null
}

export function TokenRightsByProtocol({ name, symbol, tokenRightsData, raises }: TokenRightsByProtocolProps) {
	const { overview, governance, decisions, economic, valueAccrual, alignment, resources } = tokenRightsData

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
				{/* Overview */}
				<SectionCard title="Overview">
					<p className="text-sm text-(--text-secondary)">{overview.description}</p>
					{overview.tokens.length > 0 ? (
						<Field label="Tokens">
							<PillList items={overview.tokens} />
						</Field>
					) : null}
					{overview.tokenTypes.length > 0 ? (
						<Field label="Token Type">
							<PillList items={overview.tokenTypes} />
						</Field>
					) : null}
					{overview.utility !== null ? (
						<Field label="Utility">
							<span className="text-sm">{overview.utility}</span>
						</Field>
					) : null}
				</SectionCard>

				{/* Governance */}
				<SectionCard title="Governance">
					<p className="text-sm text-(--text-secondary)">{governance.summary}</p>
					{governance.decisionTokens.length > 0 ? (
						<Field label="Voting Tokens">
							<PillList items={governance.decisionTokens} />
						</Field>
					) : null}
					{governance.details !== null ? (
						<Field label="Process Details">
							<p className="text-sm text-(--text-secondary)">{governance.details}</p>
						</Field>
					) : null}
					<LinkList links={governance.links} />
				</SectionCard>

				{/* Token Decisions */}
				<SectionCard title="Token Decisions">
					<DecisionRow label="Treasury" tokens={decisions.treasury.tokens} details={decisions.treasury.details} />
					<DecisionRow label="Revenue" tokens={decisions.revenue.tokens} details={decisions.revenue.details} />
				</SectionCard>

				{/* Economic Rights */}
				<SectionCard title="Economic Rights">
					{economic.summary !== null ? <p className="text-sm text-(--text-secondary)">{economic.summary}</p> : null}
					<FeeSwitchRow status={economic.feeSwitchStatus} details={economic.feeSwitchDetails} />
					<LinkList links={economic.links} />
				</SectionCard>

				{/* Value Accrual */}
				<SectionCard title="Value Accrual">
					{valueAccrual.primary !== null ? (
						<Field label="Primary Mechanism">
							<StatusBadge label={valueAccrual.primary} tone={valueAccrualPrimaryTone(valueAccrual.primary)} />
						</Field>
					) : null}
					{valueAccrual.details !== null ? (
						<p className="text-sm text-(--text-secondary)">{valueAccrual.details}</p>
					) : null}
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
				</SectionCard>

				{/* Token Alignment */}
				<SectionCard title="Token Alignment">
					{alignment.fundraising.length > 0 ? (
						<Field label="Fundraising">
							<PillList items={alignment.fundraising} />
						</Field>
					) : null}
					{alignment.raiseDetails !== null ? (
						<Field label="Raise Details">
							<p className="text-sm text-(--text-secondary)">{alignment.raiseDetails}</p>
						</Field>
					) : null}
					{alignment.associatedEntities.length > 0 ? (
						<Field label="Associated Entities">
							<PillList items={alignment.associatedEntities} />
						</Field>
					) : null}
					{alignment.equityRevenueCapture !== null ? (
						<Field label="Equity Revenue Capture">
							<StatusBadge
								label={alignment.equityRevenueCapture}
								tone={equityCaptureTone(alignment.equityRevenueCapture)}
							/>
						</Field>
					) : null}
					{alignment.equityStatement !== null ? (
						<p className="text-sm text-(--text-secondary)">{alignment.equityStatement}</p>
					) : null}
					{alignment.ipAndBrand !== null ? (
						<Field label="IP & Brand">
							<span className="text-sm">{alignment.ipAndBrand}</span>
						</Field>
					) : null}
					{alignment.domain !== null ? (
						<Field label="Domain">
							<span className="text-sm">{alignment.domain}</span>
						</Field>
					) : null}
					<LinkList links={alignment.links} />
				</SectionCard>

				{/* Resources */}
				{resources.addresses.length > 0 || resources.reports.length > 0 ? (
					<SectionCard title="Resources">
						<AddressList addresses={resources.addresses} />
						{resources.reports.length > 0 ? (
							<div className="flex flex-col gap-1.5">
								<span className="text-sm font-medium text-(--text-label)">Reports</span>
								<LinkList links={resources.reports} />
							</div>
						) : null}
					</SectionCard>
				) : null}
			</div>

			{/* Raise History */}
			{raises && raises.length > 0 ? (
				<SectionCard title="Raise History">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-(--cards-border) text-sm text-(--text-label)">
									<th className="pr-4 pb-2 font-medium">Date</th>
									<th className="pr-4 pb-2 font-medium">Round</th>
									<th className="pr-4 pb-2 font-medium">Amount</th>
									<th className="pr-4 pb-2 font-medium">Lead Investors</th>
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
										<td className="py-2 pr-4 whitespace-nowrap">{r.round || '—'}</td>
										<td className="py-2 pr-4 font-jetbrains whitespace-nowrap tabular-nums">
											{r.amount ? formattedNum(r.amount * 1_000_000, true) : '—'}
										</td>
										<td className="py-2 pr-4 whitespace-nowrap">{r.leadInvestors?.join(', ') || '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</SectionCard>
			) : null}
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

function SectionCard({ title, children }: { title: ReactNode; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<h2 className="font-semibold">{title}</h2>
			{children}
		</div>
	)
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm font-medium text-(--text-label)">{label}</span>
			{children}
		</div>
	)
}

function PillList({ items }: { items: string[] }) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{items.map((item) => (
				<span key={item} className="rounded-full border border-(--cards-border) bg-(--app-bg) px-2.5 py-0.5 text-sm">
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

function LinkList({ links }: { links: ITokenRightsParsedLink[] }) {
	if (links.length === 0) return null
	return (
		<div className="flex flex-col gap-1.5">
			{links.map((l) => (
				<a
					key={l.url}
					href={l.url}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2.5 text-sm hover:bg-(--link-hover-bg)"
				>
					<span className="font-medium">{l.label}</span>
					<Icon name="external-link" className="ml-auto h-3.5 w-3.5 shrink-0 text-(--text-secondary)" />
				</a>
			))}
		</div>
	)
}

function AddressList({ addresses }: { addresses: ITokenRightsParsedAddress[] }) {
	if (addresses.length === 0) return null
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-sm font-medium text-(--text-label)">Addresses</span>
			{addresses.map((a, i) => (
				<div
					key={`${a.value}-${i}`}
					className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2.5"
				>
					<div className="flex min-w-0 flex-col gap-0.5">
						{a.label ? <span className="text-sm font-medium">{a.label}</span> : null}
						<span className="truncate font-mono text-sm text-(--text-secondary)">{a.value}</span>
					</div>
					<CopyHelper toCopy={a.value} />
				</div>
			))}
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

// ---------------------------------------------------------------------------
// Tone helpers
// ---------------------------------------------------------------------------

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

function valueAccrualPrimaryTone(val: string): StatusTone {
	if (val === 'N/A') return 'neutral'
	return 'positive'
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
