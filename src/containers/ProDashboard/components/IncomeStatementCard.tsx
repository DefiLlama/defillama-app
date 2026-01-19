import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { IncomeStatement } from '~/containers/ProtocolOverview/IncomeStatement'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { useAppMetadata } from '../AppMetadataContext'
import { useProDashboardCatalog } from '../ProDashboardAPIContext'
import { IncomeStatementConfig } from '../types'
import { getItemIconUrl } from '../utils'
import { LoadingSpinner } from './LoadingSpinner'

type ViewMode = 'table' | 'sankey'

interface IncomeStatementCardProps {
	config: IncomeStatementConfig
}

export function IncomeStatementCard({ config }: IncomeStatementCardProps) {
	const { getProtocolInfo } = useProDashboardCatalog()
	const { protocolsBySlug } = useAppMetadata()
	const [view, setView] = useState<ViewMode>('sankey')

	const protocolInfo = useMemo(() => getProtocolInfo(config.protocol), [config.protocol, getProtocolInfo])
	const record = useMemo(() => {
		return protocolsBySlug.get(config.protocol) ?? protocolsBySlug.get(config.protocol.toLowerCase()) ?? null
	}, [config.protocol, protocolsBySlug])

	const displayName = useMemo(() => {
		return record?.displayName || config.protocolName || protocolInfo?.name || config.protocol
	}, [record?.displayName, config.protocolName, protocolInfo?.name, config.protocol])

	const metadata = useMemo(
		() => ({
			displayName,
			fees: Boolean(record?.flags?.fees),
			revenue: Boolean(record?.flags?.revenue),
			incentives: Boolean(record?.flags?.incentives),
			emissions: Boolean(record?.flags?.emissions)
		}),
		[
			displayName,
			record?.flags?.fees,
			record?.flags?.revenue,
			record?.flags?.incentives,
			record?.flags?.emissions
		]
	)

	const { data: incomeStatement, isLoading, isError } = useQuery({
		queryKey: ['income-statement', config.protocol],
		queryFn: () => getProtocolIncomeStatement({ metadata }),
		enabled: Boolean(config.protocol && displayName),
		staleTime: 60 * 60 * 1000
	})

	const hasData = useMemo(() => {
		if (!incomeStatement?.data) return false
		return (['monthly', 'quarterly', 'yearly'] as const).some(
			(key) => Object.keys(incomeStatement.data[key] ?? {}).length > 0
		)
	}, [incomeStatement])

	const hasIncentives = Boolean(record?.flags?.incentives || record?.flags?.emissions)
	const iconUrl = getItemIconUrl('protocol', protocolInfo, config.protocol)

	return (
		<div className="flex min-h-[360px] flex-col p-2">
			<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					{iconUrl ? (
						<img src={iconUrl} alt={displayName} className="h-5 w-5 shrink-0 rounded-full" />
					) : (
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs text-gray-600">
							{displayName?.charAt(0)?.toUpperCase()}
						</div>
					)}
					<h3 className="text-base font-semibold">{displayName}</h3>
				</div>
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
					{(['table', 'sankey'] as ViewMode[]).map((mode) => (
						<button
							key={mode}
							type="button"
							className="shrink-0 px-2 py-1 text-xs whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
							data-active={view === mode}
							onClick={() => setView(mode)}
						>
							{mode === 'table' ? 'Table' : 'Sankey'}
						</button>
					))}
				</div>
			</div>
			<div className="flex min-h-0 flex-1 flex-col">
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<LoadingSpinner />
					</div>
				) : isError ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
						<Icon name="alert-triangle" height={24} width={24} className="text-[#F2994A]" />
						<p className="text-sm text-(--text-form)">Error loading income statement</p>
					</div>
				) : !hasData ? (
					<div className="flex flex-1 items-center justify-center text-(--text-form)">No income statement data available</div>
				) : (
					<div className="min-h-0 flex-1 overflow-auto">
						<IncomeStatement
							name={displayName}
							incomeStatement={incomeStatement}
							hasIncentives={hasIncentives}
							view={view}
							anchorId={`income-statement-${config.protocol}`}
							className="border-none bg-transparent p-0"
						/>
					</div>
				)}
			</div>
		</div>
	)
}
