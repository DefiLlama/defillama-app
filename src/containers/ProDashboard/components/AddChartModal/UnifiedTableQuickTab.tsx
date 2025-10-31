import { useCallback } from 'react'
import { useProDashboard } from '../../ProDashboardAPIContext'
import type { UnifiedTableConfig } from '../../types'

interface UnifiedTableQuickTabProps {
	onClose: () => void
}

type QuickConfig = {
	id: string
	title: string
	description: string
	config: Partial<UnifiedTableConfig>
}

const QUICK_CONFIGS: QuickConfig[] = [
	{
		id: 'protocols-flat',
		title: 'Protocols — Flat',
		description: 'Single-level list of all protocols with core metrics.',
		config: {
			strategyType: 'protocols',
			rowHeaders: ['parent-protocol', 'protocol'],
			params: { chains: ['All'] },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false
			}
		}
	},
	{
		id: 'protocols-by-chain',
		title: 'Protocols by Chain',
		description: 'Group protocols under the chains they deploy on.',
		config: {
			strategyType: 'protocols',
			rowHeaders: ['chain', 'parent-protocol', 'protocol'],
			params: { chains: ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Polygon'] }
		}
	},
	{
		id: 'protocols-by-category',
		title: 'Protocols by Category',
		description: 'Compare categories and drill into their protocols.',
		config: {
			strategyType: 'protocols',
			rowHeaders: ['category', 'parent-protocol', 'protocol'],
			params: { chains: ['All'] },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false
			}
		}
	},
	{
		id: 'protocols-ethereum',
		title: 'Ethereum Protocols',
		description: 'Focus on Ethereum ecosystem protocols.',
		config: {
			strategyType: 'protocols',
			rowHeaders: ['category', 'parent-protocol', 'protocol'],
			params: { chains: ['Ethereum'] }
		}
	},
	{
		id: 'protocols-layer2',
		title: 'Layer 2 Protocols',
		description: 'Compare protocols across major L2 networks.',
		config: {
			strategyType: 'protocols',
			rowHeaders: ['chain', 'category', 'parent-protocol', 'protocol'],
			params: { chains: ['Arbitrum', 'Base', 'Optimism', 'Polygon', 'zkSync'] },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false
			}
		}
	},
	{
		id: 'protocols-defi',
		title: 'DeFi Categories',
		description: 'Deep dive into DeFi protocol categories.',
		config: {
			strategyType: 'protocols',
			rowHeaders: ['category', 'parent-protocol', 'protocol'],
			params: { chains: ['All'], categories: ['DEXes', 'Lending', 'Bridges', 'Liquid Staking'] },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false
			}
		}
	},
	{
		id: 'chains-all',
		title: 'All Chains Overview',
		description: 'Complete view of all blockchain networks.',
		config: {
			strategyType: 'chains',
			rowHeaders: ['chain'],
			params: { category: null },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false
			}
		}
	},
	{
		id: 'chains-layer2',
		title: 'Chains — Layer 2s',
		description: 'Layer 2 snapshot showing TVL, volume, fees and revenue.',
		config: {
			strategyType: 'chains',
			rowHeaders: ['chain'],
			params: { category: 'Layer 2' },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false
			}
		}
	},
	{
		id: 'chains-alternatives',
		title: 'Alternative L1s',
		description: 'Compare alternative layer 1 blockchains.',
		config: {
			strategyType: 'chains',
			rowHeaders: ['chain'],
			params: { category: 'Layer 1' },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false
			}
		}
	},
	{
		id: 'protocols-simple',
		title: 'Protocols — Simple View',
		description: 'Clean protocol list with essential metrics only.',
		config: {
			strategyType: 'protocols',
			rowHeaders: ['protocol'],
			params: { chains: ['All'] },
			columnVisibility: {
				perpsVolume24h: false,
				openInterest: false,
				users: false,
				txs: false
			}
		}
	}
]

export function UnifiedTableQuickTab({ onClose }: UnifiedTableQuickTabProps) {
	const { handleAddUnifiedTable } = useProDashboard()

	const handleCreate = useCallback(
		(config: Partial<UnifiedTableConfig>) => {
			handleAddUnifiedTable(config)
			onClose()
		},
		[handleAddUnifiedTable, onClose]
	)

	return (
		<div className="flex flex-col gap-4">
			<div className="pro-text2 text-sm">
				<p>
					Start with a preset unified table configuration. Each option creates a new dashboard item so you can test the
					renderer quickly.
				</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				{QUICK_CONFIGS.map((option) => (
					<div
						key={option.id}
						className="flex h-full flex-col justify-between rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4 shadow-sm"
					>
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-semibold text-(--text-primary)">{option.title}</h3>
							<p className="text-xs text-(--text-secondary)">{option.description}</p>
						</div>
						<button
							type="button"
							onClick={() => handleCreate(option.config)}
							className="mt-4 inline-flex items-center justify-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-(--primary-dark)"
						>
							Add Unified Table
						</button>
					</div>
				))}
			</div>
		</div>
	)
}
