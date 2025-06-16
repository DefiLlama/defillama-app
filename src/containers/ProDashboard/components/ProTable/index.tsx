import * as React from 'react'
import { useProTable } from './useProTable'
import { TableHeader } from './TableHeader'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { TableBody } from './TableBody'
import { TablePagination } from './TablePagination'
import { ProtocolFilterModal } from './ProtocolFilterModal'
import { memo, useMemo, useState } from 'react'
import { TableFilters } from '../../types'
import { useProDashboard } from '../../ProDashboardAPIContext'

export const ProtocolsByChainTable = memo(function ProtocolsByChainTable({
	tableId,
	chains = ['All'],
	colSpan = 2,
	filters
}: {
	tableId: string
	chains: string[]
	colSpan?: 1 | 2
	filters?: TableFilters
}) {
	const { handleTableFiltersChange } = useProDashboard()
	const [showFilterModal, setShowFilterModal] = useState(false)
	const memoizedChains = useMemo(() => chains, [chains.join(',')])
	const proDashboardElement = typeof window !== 'undefined' ? document.querySelector('.pro-dashboard') : null

	const {
		table,
		showColumnPanel,
		setShowColumnPanel,
		searchTerm,
		setSearchTerm,
		currentColumns,
		columnOrder,
		addOption,
		toggleColumnVisibility,
		columnPresets,
		applyPreset,
		downloadCSV,
		customColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn,
		categories,
		availableProtocols
	} = useProTable(memoizedChains, filters, () => setShowFilterModal(true))

	const handleFiltersChange = (newFilters: TableFilters) => {
		handleTableFiltersChange(tableId, newFilters)
	}

	return (
		<div className="w-full p-4 h-full flex flex-col">
			<TableHeader
				chains={chains}
				columnPresets={columnPresets}
				applyPreset={applyPreset}
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				downloadCSV={downloadCSV}
				colSpan={colSpan}
			/>

			<ColumnManagementPanel
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				currentColumns={currentColumns}
				columnOrder={columnOrder}
				addOption={addOption}
				toggleColumnVisibility={toggleColumnVisibility}
				customColumns={customColumns}
				onAddCustomColumn={addCustomColumn}
				onRemoveCustomColumn={removeCustomColumn}
				onUpdateCustomColumn={updateCustomColumn}
			/>

			<TableBody table={table} />

			<TablePagination table={table} />

			{proDashboardElement && (
				<ProtocolFilterModal
					isOpen={showFilterModal}
					onClose={() => setShowFilterModal(false)}
					protocols={availableProtocols}
					categories={categories}
					currentFilters={filters || {}}
					onFiltersChange={handleFiltersChange}
					portalTarget={proDashboardElement as HTMLElement}
				/>
			)}
		</div>
	)
})
