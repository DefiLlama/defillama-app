import * as React from 'react'
import { useProTable } from './useProTable'
import { TableHeader } from './TableHeader'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { TableBody } from './TableBody'
import { TablePagination } from './TablePagination'
import { memo, useMemo } from 'react'

export const ProtocolsByChainTable = memo(function ProtocolsByChainTable({
	chains = ['All'],
	colSpan = 2
}: {
	chains: string[]
	colSpan?: 1 | 2
}) {
	const memoizedChains = useMemo(() => chains, [chains.join(',')])
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
		updateCustomColumn
	} = useProTable(memoizedChains)

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
		</div>
	)
})
