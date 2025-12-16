import { createContext, useContext } from 'react'
import type { UseComparisonWizardReturn } from './hooks/useComparisonWizard'
import { useComparisonWizard } from './hooks/useComparisonWizard'
import { useMetricAvailability } from './hooks/useMetricAvailability'
import type { MetricWithAvailability } from './types'

interface ComparisonWizardContextValue extends UseComparisonWizardReturn {
	availableMetrics: MetricWithAvailability[]
}

const ComparisonWizardContext = createContext<ComparisonWizardContextValue | undefined>(undefined)

export function ComparisonWizardProvider({ children }: { children: React.ReactNode }) {
	const wizard = useComparisonWizard()
	const availableMetrics = useMetricAvailability(wizard.state.selectedItems, wizard.state.comparisonType)

	return (
		<ComparisonWizardContext.Provider value={{ ...wizard, availableMetrics }}>
			{children}
		</ComparisonWizardContext.Provider>
	)
}

export function useComparisonWizardContext() {
	const ctx = useContext(ComparisonWizardContext)
	if (!ctx) {
		throw new Error('useComparisonWizardContext must be used within a ComparisonWizardProvider')
	}
	return ctx
}
