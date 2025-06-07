import * as React from 'react'
import { useProTable } from './useProTable'
import { TableHeader } from './TableHeader'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { TableBody } from './TableBody'
import { TablePagination } from './TablePagination'

export function ProtocolsByChainTable({ chain = 'All' }: { chain: string }) {
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
		downloadCSV
	} = useProTable(chain)

	return (
		<div className="w-full bg-[var(--bg7)] bg-opacity-30 backdrop-filter backdrop-blur-xl border border-[var(--divider)] p-4 h-full relative bg-clip-padding flex flex-col">
			<TableHeader
				chain={chain}
				columnPresets={columnPresets}
				applyPreset={applyPreset}
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				downloadCSV={downloadCSV}
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
			/>

			<TableBody table={table} />

			<TablePagination table={table} />
		</div>
	)
}
