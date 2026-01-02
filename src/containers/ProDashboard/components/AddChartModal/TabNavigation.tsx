import { memo } from 'react'
import { DashboardItemConfig } from '../../types'
import { MainTabType } from './types'

interface TabNavigationProps {
	selectedMainTab: MainTabType
	editItem?: DashboardItemConfig | null
	onTabChange: (tab: MainTabType) => void
	isLlama?: boolean
}

export const TabNavigation = memo(function TabNavigation({ selectedMainTab, editItem, onTabChange, isLlama }: TabNavigationProps) {
	const baseTabs = [
		{ id: 'charts' as const, label: 'Charts', subtitle: '', mobileLabel: 'Charts' },
		{ id: 'metric' as const, label: 'Metric', mobileLabel: 'Metric' },
		{ id: 'table' as const, label: 'Table', mobileLabel: 'Table' },
		{ id: 'text' as const, label: 'Text', subtitle: '(Markdown)', mobileLabel: 'Text' }
	]

	const allTabs = isLlama
		? [...baseTabs, { id: 'llamaai' as const, label: 'LlamaAI', subtitle: '', mobileLabel: 'LlamaAI' }]
		: baseTabs

	return (
		<div className="rounded-xl border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1 shadow-sm">
			<div className={`grid gap-1 ${isLlama ? 'grid-cols-5' : 'grid-cols-4'}`}>
				{allTabs.map((tab) => (
					<button
						key={tab.id}
						className={`rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-200 md:text-sm ${
							selectedMainTab === tab.id
								? 'bg-(--old-blue) text-white shadow-md ring-1 ring-black/10'
								: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary) hover:shadow-sm'
						} ${editItem ? 'cursor-not-allowed opacity-50' : ''}`}
						onClick={() => !editItem && onTabChange(tab.id)}
						disabled={!!editItem}
					>
						<span className="lg:hidden">{tab.mobileLabel}</span>
						<span className="hidden lg:inline">
							{tab.label}
							{tab.subtitle && <span className="ml-1 text-xs opacity-70">{tab.subtitle}</span>}
						</span>
					</button>
				))}
			</div>
		</div>
	)
})
