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
	filters,
	columnOrder,
	columnVisibility,
	customColumns
}: {
	tableId: string
	chains: string[]
	colSpan?: 1 | 2
	filters?: TableFilters
	columnOrder?: string[]
	columnVisibility?: Record<string, boolean>
	customColumns?: any[]
}) {
	const { handleTableFiltersChange, handleTableColumnsChange } = useProDashboard()
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
		columnOrder: currentColumnOrder,
		addOption,
		toggleColumnVisibility,
		moveColumnUp,
		moveColumnDown,
		columnPresets,
		applyPreset,
		activePreset,
		downloadCSV,
		customColumns: currentCustomColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn,
		categories,
		availableProtocols
	} = useProTable(memoizedChains, filters, () => setShowFilterModal(true), {
		initialColumnOrder: columnOrder,
		initialColumnVisibility: columnVisibility,
		initialCustomColumns: customColumns,
		onColumnsChange: (newColumnOrder, newColumnVisibility, newCustomColumns) => {
			handleTableColumnsChange(tableId, newColumnOrder, newColumnVisibility, newCustomColumns)
		}
	})

	const handleFiltersChange = (newFilters: TableFilters) => {
		handleTableFiltersChange(tableId, newFilters)
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden p-2 sm:p-4">
			<TableHeader
				chains={chains}
				columnPresets={columnPresets}
				applyPreset={applyPreset}
				activePreset={activePreset}
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
				columnOrder={currentColumnOrder}
				addOption={addOption}
				toggleColumnVisibility={toggleColumnVisibility}
				moveColumnUp={moveColumnUp}
				moveColumnDown={moveColumnDown}
				customColumns={currentCustomColumns}
				onAddCustomColumn={addCustomColumn}
				onRemoveCustomColumn={removeCustomColumn}
				onUpdateCustomColumn={updateCustomColumn}
			/>

			<TableBody table={table} moveColumnUp={moveColumnUp} moveColumnDown={moveColumnDown} />

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
