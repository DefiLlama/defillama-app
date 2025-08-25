import { DashboardItemConfig } from '../../types'
import { MainTabType } from './types'

interface TabNavigationProps {
	selectedMainTab: MainTabType
	editItem?: DashboardItemConfig | null
	onTabChange: (tab: MainTabType) => void
}

export function TabNavigation({ selectedMainTab, editItem, onTabChange }: TabNavigationProps) {
	const tabs = [
		{ id: 'charts' as const, label: 'Charts', subtitle: '(Single & Multi)', mobileLabel: 'Charts' },
		{ id: 'builder' as const, label: 'Chart Builder', mobileLabel: 'Builder' },
		{ id: 'table' as const, label: 'Table', subtitle: '(Dataset)', mobileLabel: 'Table' },
		{ id: 'text' as const, label: 'Text', subtitle: '(Markdown)', mobileLabel: 'Text' }
	]

	return (
		<div className="mb-4 grid grid-cols-4 gap-0 md:mb-6">
			{tabs.map((tab, index) => (
				<button
					key={tab.id}
					className={`border px-2 py-2.5 text-xs font-medium transition-colors duration-200 md:px-4 md:py-3 md:text-sm ${
						selectedMainTab === tab.id
							? 'border-(--primary) bg-(--primary) text-white'
							: 'pro-border pro-hover-bg pro-text2'
					}`}
					onClick={() => !editItem && onTabChange(tab.id)}
					disabled={!!editItem}
				>
					<span className="lg:hidden">{tab.mobileLabel}</span>
					<span className="hidden lg:inline">
						{tab.label}
						{tab.subtitle && <span className="text-xs opacity-70"> {tab.subtitle}</span>}
					</span>
				</button>
			))}
		</div>
	)
}
