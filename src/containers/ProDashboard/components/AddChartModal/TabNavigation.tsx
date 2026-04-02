import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscription/auth'
import type { DashboardItemConfig } from '../../types'
import type { MainTabType } from './types'

const PRO_ONLY_TABS = new Set<MainTabType>(['llamaai'])

interface TabNavigationProps {
	selectedMainTab: MainTabType
	editItem?: DashboardItemConfig | null
	onTabChange: (tab: MainTabType) => void
}

export function TabNavigation({ selectedMainTab, editItem, onTabChange }: TabNavigationProps) {
	const { hasActiveSubscription } = useAuthContext()

	const allTabs = [
		{ id: 'charts' as const, label: 'Charts', subtitle: '', mobileLabel: 'Charts' },
		{ id: 'metric' as const, label: 'Metric', mobileLabel: 'Metric' },
		{ id: 'table' as const, label: 'Table', mobileLabel: 'Table' },
		{ id: 'text' as const, label: 'Text', subtitle: '(Markdown)', mobileLabel: 'Text' },
		{ id: 'llamaai' as const, label: 'LlamaAI', subtitle: '', mobileLabel: 'LlamaAI' }
	]

	return (
		<div className="rounded-xl border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1 shadow-sm">
			<div className="grid grid-cols-5 gap-1">
				{allTabs.map((tab) => {
					const isProLocked = PRO_ONLY_TABS.has(tab.id) && !hasActiveSubscription
					return (
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
							<span className="lg:hidden">
								{tab.mobileLabel}
								{isProLocked ? <Icon name="file-lock-2" height={10} width={10} className="ml-1 inline" /> : null}
							</span>
							<span className="hidden lg:inline">
								{tab.label}
								{tab.subtitle ? <span className="ml-1 text-xs opacity-70">{tab.subtitle}</span> : null}
								{isProLocked ? (
									<Icon name="file-lock-2" height={10} width={10} className="ml-1 inline opacity-70" />
								) : null}
							</span>
						</button>
					)
				})}
			</div>
		</div>
	)
}
