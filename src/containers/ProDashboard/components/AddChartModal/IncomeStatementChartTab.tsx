import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { IncomeStatement } from '~/containers/ProtocolOverview/IncomeStatement'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { useAppMetadata } from '../../AppMetadataContext'
import { AriakitVirtualizedSelect, type VirtualizedSelectOption } from '../AriakitVirtualizedSelect'

interface IncomeStatementChartTabProps {
	selectedIncomeStatementProtocol: string | null
	selectedIncomeStatementProtocolName: string | null
	onSelectedIncomeStatementProtocolChange: (protocol: string | null) => void
	onSelectedIncomeStatementProtocolNameChange: (name: string | null) => void
	protocolOptions: VirtualizedSelectOption[]
	protocolsLoading: boolean
}

export function IncomeStatementChartTab({
	selectedIncomeStatementProtocol,
	selectedIncomeStatementProtocolName,
	onSelectedIncomeStatementProtocolChange,
	onSelectedIncomeStatementProtocolNameChange,
	protocolOptions,
	protocolsLoading
}: IncomeStatementChartTabProps) {
	const { protocolsBySlug } = useAppMetadata()

	const filteredProtocolOptions = useMemo(() => {
		return protocolOptions.filter((option) => {
			const record = protocolsBySlug.get(option.value) ?? protocolsBySlug.get(option.value.toLowerCase())
			return Boolean(record?.flags?.fees && record?.flags?.revenue)
		})
	}, [protocolOptions, protocolsBySlug])

	const selectedRecord = useMemo(() => {
		if (!selectedIncomeStatementProtocol) return null
		return (
			protocolsBySlug.get(selectedIncomeStatementProtocol) ??
			protocolsBySlug.get(selectedIncomeStatementProtocol.toLowerCase()) ??
			null
		)
	}, [protocolsBySlug, selectedIncomeStatementProtocol])

	const displayName = useMemo(() => {
		return selectedRecord?.displayName || selectedIncomeStatementProtocolName || selectedIncomeStatementProtocol || ''
	}, [selectedRecord?.displayName, selectedIncomeStatementProtocolName, selectedIncomeStatementProtocol])

	const metadata = useMemo(
		() => ({
			displayName,
			fees: Boolean(selectedRecord?.flags?.fees),
			revenue: Boolean(selectedRecord?.flags?.revenue),
			incentives: Boolean(selectedRecord?.flags?.incentives),
			emissions: Boolean(selectedRecord?.flags?.emissions)
		}),
		[
			displayName,
			selectedRecord?.flags?.fees,
			selectedRecord?.flags?.revenue,
			selectedRecord?.flags?.incentives,
			selectedRecord?.flags?.emissions
		]
	)

	const { data: incomeStatement, isLoading } = useQuery({
		queryKey: ['income-statement-preview', selectedIncomeStatementProtocol],
		queryFn: () => getProtocolIncomeStatement({ metadata }),
		enabled: Boolean(selectedIncomeStatementProtocol && displayName),
		staleTime: 60 * 60 * 1000
	})

	const hasData = useMemo(() => {
		if (!incomeStatement?.data) return false
		return (['monthly', 'quarterly', 'yearly'] as const).some(
			(key) => Object.keys(incomeStatement.data[key] ?? {}).length > 0
		)
	}, [incomeStatement])

	const hasIncentives = Boolean(selectedRecord?.flags?.incentives || selectedRecord?.flags?.emissions)
	const hasSelection = Boolean(selectedIncomeStatementProtocol)

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-3">
				<AriakitVirtualizedSelect
					label="Protocol"
					options={filteredProtocolOptions}
					selectedValue={selectedIncomeStatementProtocol || ''}
					onChange={(option) => {
						onSelectedIncomeStatementProtocolChange(option.value)
						onSelectedIncomeStatementProtocolNameChange(option.label)
					}}
					placeholder="Select protocol..."
					isLoading={protocolsLoading}
				/>
				{!protocolsLoading && filteredProtocolOptions.length === 0 ? (
					<div className="text-xs pro-text3">No protocols with both fees and revenue.</div>
				) : null}
			</div>

			<div className="overflow-hidden rounded-lg border pro-border">
				<div className="border-b border-(--cards-border) px-3 py-2 text-xs font-medium pro-text2">Preview</div>
				{hasSelection ? (
					<div className="bg-(--cards-bg) p-3">
						{isLoading ? (
							<div className="flex h-[360px] items-center justify-center">
								<LocalLoader />
							</div>
						) : !hasData ? (
							<div className="flex h-[360px] items-center justify-center text-center pro-text3">
								No income statement data available.
							</div>
						) : (
							<div>
								<IncomeStatement
									name={displayName || selectedIncomeStatementProtocolName || selectedIncomeStatementProtocol || ''}
									incomeStatement={incomeStatement}
									hasIncentives={hasIncentives}
									view="sankey"
									anchorId={`income-statement-preview-${selectedIncomeStatementProtocol}`}
									className="border-none bg-transparent p-0"
								/>
							</div>
						)}
					</div>
				) : (
					<div className="flex h-[360px] items-center justify-center text-center pro-text3">
						<div>
							<Icon name="file-text" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select a protocol to preview the income statement</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
