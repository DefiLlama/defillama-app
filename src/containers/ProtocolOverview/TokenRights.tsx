import type { ReactNode } from 'react'
import { CopyHelper } from '~/components/Copy'
import { Icon } from '~/components/Icon'
import type { ITokenRights } from './types'

type StatusTone = 'positive' | 'negative' | 'warning' | 'neutral'

function getToneStyles(tone: StatusTone): { container: string; text: string; icon: string } {
	switch (tone) {
		case 'positive':
			return {
				container: 'border-green-600/30 bg-green-600/10',
				text: 'text-green-700 dark:text-green-400',
				icon: 'text-green-700 dark:text-green-400'
			}
		case 'negative':
			return {
				container: 'border-red-600/30 bg-red-600/10',
				text: 'text-red-700 dark:text-red-400',
				icon: 'text-red-700 dark:text-red-400'
			}
		case 'warning':
			return {
				container: 'border-amber-600/30 bg-amber-600/10',
				text: 'text-amber-700 dark:text-amber-400',
				icon: 'text-amber-700 dark:text-amber-400'
			}
		case 'neutral':
		default:
			return {
				container: 'border-(--cards-border) bg-(--cards-bg)',
				text: 'text-(--text-label)',
				icon: 'text-(--text-secondary)'
			}
	}
}

const SectionCard = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
	<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
		<h3 className="font-semibold">{title}</h3>
		{children}
	</div>
)

const StatusPill = ({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) => {
	const styles = getToneStyles(tone)
	return (
		<span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${styles.container}`}>
			<span className={`font-medium ${styles.text}`}>{label}</span>
		</span>
	)
}

const StatusRow = ({
	label,
	value,
	tone,
	details
}: {
	label: string
	value?: string | null
	tone: StatusTone
	details?: string | null
}) => {
	if (!value) return null

	const styles = getToneStyles(tone)
	return (
		<div className={`flex flex-col gap-1 rounded-md border p-2 ${styles.container}`}>
			<div className="flex items-start justify-between gap-2">
				<span className={`font-medium ${styles.text}`}>{label}</span>
				<StatusPill label={value} tone={tone} />
			</div>
			{details ? <p className="text-sm text-(--text-secondary)">{details}</p> : null}
		</div>
	)
}

function governanceRightsTone(rights?: string | null): StatusTone {
	switch (rights) {
		case 'FULL':
			return 'positive'
		case 'LIMITED':
			return 'warning'
		case 'NONE':
			return 'negative'
		default:
			return 'neutral'
	}
}

function feeSwitchTone(status?: string | null): StatusTone {
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

function valueAccrualTone(status?: string | null): StatusTone {
	switch (status) {
		case 'ACTIVE':
			return 'positive'
		case 'INACTIVE':
			return 'warning'
		case 'NONE':
			return 'neutral'
		default:
			return 'neutral'
	}
}

function fundraisingTone(status?: string | null): StatusTone {
	switch (status) {
		case 'TOKEN':
			return 'positive'
		case 'EQUITY':
			return 'warning'
		case 'NONE':
			return 'neutral'
		default:
			return 'neutral'
	}
}

function equityRevenueCaptureTone(status?: string | null): StatusTone {
	switch (status) {
		case 'ACTIVE':
			return 'negative'
		case 'PARTIAL':
			return 'warning'
		case 'INACTIVE':
			return 'positive'
		default:
			return 'neutral'
	}
}

export const TokenRights = ({ tokenRights }: { tokenRights: ITokenRights }) => {
	if (!tokenRights) return null

	const rights = tokenRights.rights ?? []
	const governance = tokenRights.governanceData
	const valueAccrual = tokenRights.holdersRevenueAndValueAccrual
	const tokenAlignment = tokenRights.tokenAlignment
	const resources = tokenRights.resources ?? []

	return (
		<div className="grid grid-cols-1 gap-2">
			<div className="grid gap-2 xl:grid-cols-2">
				{rights.length > 0 ? (
					<SectionCard title="Overview">
						<div className="flex flex-col gap-2">
							{rights.map((r) => {
								const tone: StatusTone = r.hasRight ? 'positive' : 'negative'
								const styles = getToneStyles(tone)
								return (
									<div
										key={`${r.label}-${String(r.hasRight)}`}
										className={`flex items-start justify-between gap-2 rounded-md border p-2 ${styles.container}`}
									>
										<div className="flex flex-col gap-1">
											<span className={`font-medium ${styles.text}`}>{r.label}</span>
											{r.details ? <span className="text-sm text-(--text-secondary)">{r.details}</span> : null}
										</div>
										<Icon name={r.hasRight ? 'check-circle' : 'x'} className={`h-5 w-5 shrink-0 ${styles.icon}`} />
									</div>
								)
							})}
						</div>
					</SectionCard>
				) : null}

				{governance ? (
					<SectionCard title="Governance">
						<div className="flex flex-col gap-2">
							<StatusRow
								label="Token governance rights"
								value={governance.rights}
								tone={governanceRightsTone(governance.rights)}
								details={governance.details ?? null}
							/>
							<StatusRow
								label="Fee switch"
								value={governance.feeSwitchStatus ?? null}
								tone={feeSwitchTone(governance.feeSwitchStatus ?? null)}
								details={governance.feeSwitchDetails ?? null}
							/>
							{governance.links?.length ? (
								<div className="flex flex-col gap-1">
									<span className="text-sm font-medium text-(--text-label)">Links</span>
									<div className="flex flex-col gap-1">
										{governance.links.map((l) => (
											<a
												key={`${l.label}-${l.url}`}
												href={l.url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 hover:bg-(--link-hover-bg)"
											>
												<span className="text-sm font-medium">{l.label}</span>
												<span className="ml-auto text-xs text-(--text-secondary)">Open</span>
												<Icon name="external-link" className="h-3.5 w-3.5 text-(--text-secondary)" />
											</a>
										))}
									</div>
								</div>
							) : null}
						</div>
					</SectionCard>
				) : null}

				{valueAccrual ? (
					<SectionCard title="Holders revenue & value accrual">
						<div className="flex flex-col gap-2">
							<StatusRow
								label="Buybacks"
								value={valueAccrual.buybacks ?? null}
								tone={valueAccrualTone(valueAccrual.buybacks ?? null)}
							/>
							<StatusRow
								label="Dividends"
								value={valueAccrual.dividends ?? null}
								tone={valueAccrualTone(valueAccrual.dividends ?? null)}
							/>
							<StatusRow
								label="Burns"
								value={valueAccrual.burns ?? null}
								tone={valueAccrualTone(valueAccrual.burns ?? null)}
							/>
							{valueAccrual.primaryValueAccrual ? (
								<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
									<span className="text-sm font-medium text-(--text-label)">Primary value accrual</span>
									<p className="mt-1 text-sm text-(--text-secondary)">{valueAccrual.primaryValueAccrual}</p>
								</div>
							) : null}
							{valueAccrual.burnSources?.length ? (
								<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
									<span className="text-sm font-medium text-(--text-label)">Burn sources</span>
									<ul className="mt-1 list-inside list-disc text-sm text-(--text-secondary)">
										{valueAccrual.burnSources.map((s) => (
											<li key={s}>{s}</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					</SectionCard>
				) : null}

				{tokenAlignment ? (
					<SectionCard title="Token alignment">
						<div className="flex flex-col gap-2">
							<StatusRow
								label="Fundraising"
								value={tokenAlignment.fundraising ?? null}
								tone={fundraisingTone(tokenAlignment.fundraising ?? null)}
							/>
							<StatusRow
								label="Equity revenue capture"
								value={tokenAlignment.equityRevenueCapture ?? null}
								tone={equityRevenueCaptureTone(tokenAlignment.equityRevenueCapture ?? null)}
								details={tokenAlignment.equityStatement ?? null}
							/>
							{tokenAlignment.raiseDetailsLink?.url ? (
								<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
									<span className="text-sm font-medium text-(--text-label)">Raise details</span>
									<div className="mt-1">
										<a
											href={tokenAlignment.raiseDetailsLink.url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-sm font-medium text-(--link-text) hover:underline"
										>
											<Icon name="external-link" className="h-4 w-4" />
											{tokenAlignment.raiseDetailsLink.label ?? 'Open'}
										</a>
									</div>
								</div>
							) : null}
							{tokenAlignment.associatedEntities?.length ? (
								<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
									<span className="text-sm font-medium text-(--text-label)">Associated entities</span>
									<div className="mt-1 flex flex-wrap gap-1.5">
										{tokenAlignment.associatedEntities.map((e) => (
											<span
												key={e}
												className="rounded-full border border-(--cards-border) bg-(--app-bg) px-2 py-0.5 text-xs text-(--text-secondary)"
											>
												{e}
											</span>
										))}
									</div>
								</div>
							) : null}
						</div>
					</SectionCard>
				) : null}

				{resources.length > 0 ? (
					<SectionCard title="Resources">
						<div className="flex flex-col gap-2">
							{resources.map((r) => (
								<div
									key={`${r.label}-${r.address ?? ''}-${r.url ?? ''}`}
									className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2"
								>
									<div className="flex items-start justify-between gap-2">
										<span className="font-medium">{r.label}</span>
										{r.url ? (
											<a
												href={r.url}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 text-xs text-(--link-text) hover:underline"
											>
												Open <Icon name="external-link" className="h-3.5 w-3.5" />
											</a>
										) : null}
									</div>
									{r.address ? (
										<div className="flex items-center justify-between gap-2">
											<span className="font-mono text-xs break-all">{r.address}</span>
											<CopyHelper toCopy={r.address} />
										</div>
									) : null}
									{r.note ? <p className="text-sm text-(--text-secondary)">{r.note}</p> : null}
									{!r.url && !r.address && r.note == null ? (
										<p className="text-sm text-(--text-secondary)">No additional details.</p>
									) : null}
								</div>
							))}
						</div>
					</SectionCard>
				) : null}
			</div>

			{/* If everything is missing (partial payload), show a helpful empty state */}
			{rights.length === 0 && !governance && !valueAccrual && !tokenAlignment && resources.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<p className="p-2">No token rights data available for this protocol.</p>
				</div>
			) : null}
		</div>
	)
}
