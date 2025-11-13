import { createContext, useContext } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import type { TableFilters, UnifiedTableConfig, UnifiedRowHeaderType } from '../../../types'
import { useUnifiedTableWizard } from './hooks/useUnifiedTableWizard'

interface WizardContextValue {
	state: {
		strategyType: UnifiedTableConfig['strategyType']
		chains: string[]
		category: string | null
		rowHeaders: UnifiedRowHeaderType[]
		filters: TableFilters
		activePresetId: string
		columnOrder: ColumnOrderState
		columnVisibility: VisibilityState
		sorting: SortingState
	}
	actions: ReturnType<typeof useUnifiedTableWizard>['actions']
	derived: ReturnType<typeof useUnifiedTableWizard>['derived']
}

const WizardContext = createContext<WizardContextValue | null>(null)

export const UnifiedTableWizardProvider = ({
	children,
	initialStrategy,
	initialPresetId,
	initialConfig
}: {
	children: React.ReactNode
	initialStrategy?: UnifiedTableConfig['strategyType']
	initialPresetId?: string
	initialConfig?: UnifiedTableConfig | null
}) => {
	const resolvedStrategy = initialStrategy ?? initialConfig?.strategyType ?? 'protocols'
	const wizard = useUnifiedTableWizard(resolvedStrategy, initialPresetId, initialConfig ?? undefined)

	return <WizardContext.Provider value={wizard}>{children}</WizardContext.Provider>
}

export const useUnifiedTableWizardContext = () => {
	const ctx = useContext(WizardContext)
	if (!ctx) {
		throw new Error('useUnifiedTableWizardContext must be used inside UnifiedTableWizardProvider')
	}
	return ctx
}
