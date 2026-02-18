import { useMemo, useState } from 'react'
import { useProDashboardEditorActions } from '../../ProDashboardAPIContext'
import type { TableFilters } from '../../types'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { ProtocolFilterModal } from './ProtocolFilterModal'
import { TableBody } from './TableBody'
import { TableHeader } from './TableHeader'
import { TablePagination } from './TablePagination'
import { useProTable } from './useProTable'

export function ProtocolsByChainTable({
	tableId,
	chains = ['All'],
	colSpan = 2,
	filters,
	columnOrder,
	columnVisibility,
	customColumns,
	activeViewId,
	activePresetId
}: {
	tableId: string
	chains: string[]
	colSpan?: 1 | 2
	filters?: TableFilters
	columnOrder?: string[]
	columnVisibility?: Record<string, boolean>
	customColumns?: any[]
	activeViewId?: string
	activePresetId?: string
}) {
	const { handleTableFiltersChange, handleTableColumnsChange } = useProDashboardEditorActions()
	const [showFilterModal, setShowFilterModal] = useState(false)
	const chainsKey = chains.join(',')
	// oxlint-disable-next-line react/exhaustive-deps
	const memoizedChains = useMemo(() => chains, [chainsKey])
	const proDashboardElement = typeof window !== 'undefined' ? document.querySelector('.pro-dashboard') : null

	const {
		table,
		isLoading,
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
		availableProtocols,
		parentProtocols,
		customViews: currentCustomViews,
		saveCustomView,
		deleteCustomView,
		loadCustomView
	} = useProTable(memoizedChains, filters, () => setShowFilterModal(true), {
		initialColumnOrder: columnOrder,
		initialColumnVisibility: columnVisibility,
		initialCustomColumns: customColumns,
		initialActiveViewId: activeViewId,
		initialActivePresetId: activePresetId,
		onColumnsChange: (newColumnOrder, newColumnVisibility, newCustomColumns, newActiveViewId, newActivePresetId) => {
			handleTableColumnsChange(
				tableId,
				newColumnOrder,
				newColumnVisibility,
				newCustomColumns,
				newActiveViewId,
				newActivePresetId
			)
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
				customViews={currentCustomViews}
				onSaveView={saveCustomView}
				onLoadView={loadCustomView}
				onDeleteView={deleteCustomView}
				currentColumns={currentColumns}
				columnOrder={currentColumnOrder}
				customColumns={currentCustomColumns}
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
				customViews={currentCustomViews}
				onLoadView={loadCustomView}
				onDeleteView={deleteCustomView}
				activeViewId={activePreset}
			/>

			<TableBody table={table} isLoading={isLoading} moveColumnUp={moveColumnUp} moveColumnDown={moveColumnDown} />

			<TablePagination table={table} />

			{proDashboardElement && (
				<ProtocolFilterModal
					isOpen={showFilterModal}
					onClose={() => setShowFilterModal(false)}
					protocols={availableProtocols}
					parentProtocols={parentProtocols as any}
					categories={categories}
					currentFilters={filters || {}}
					onFiltersChange={handleFiltersChange}
					portalTarget={proDashboardElement as HTMLElement}
				/>
			)}
		</div>
	)
}
