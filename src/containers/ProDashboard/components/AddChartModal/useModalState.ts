import { useState, useEffect } from 'react'
import { ModalState, MainTabType, ChartTabType, CombinedTableType } from './types'
import { DashboardItemConfig, ChartConfig } from '../../types'

export function useModalState(editItem?: DashboardItemConfig | null, isOpen?: boolean) {
	const [selectedMainTab, setSelectedMainTab] = useState<MainTabType>('chart')
	const [selectedChartTab, setSelectedChartTab] = useState<ChartTabType>('chain')
	const [composerItems, setComposerItems] = useState<ChartConfig[]>([])
	const [composerSubType, setComposerSubType] = useState<ChartTabType>('chain')
	const [composerChartName, setComposerChartName] = useState<string>('')
	const [composerScript, setComposerScript] = useState<string>('')
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [selectedChains, setSelectedChains] = useState<string[]>([])
	const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
	const [selectedChartType, setSelectedChartType] = useState<string>('tvl')
	const [textTitle, setTextTitle] = useState<string>('')
	const [textContent, setTextContent] = useState<string>('')
	const [selectedTableType, setSelectedTableType] = useState<CombinedTableType>('protocols')
	const [selectedDatasetChain, setSelectedDatasetChain] = useState<string | null>(null)
	const [selectedTokens, setSelectedTokens] = useState<string[]>([])
	const [includeCex, setIncludeCex] = useState<boolean>(false)

	// Initialize state based on editItem
	useEffect(() => {
		if (editItem) {
			if (editItem.kind === 'chart' && editItem.type === 'llamascript') {
				setSelectedMainTab('composer')
				setComposerChartName(editItem.name || '')
				setComposerScript(editItem.llamascript || '')
				setComposerItems([])
				setComposerSubType('chain')
				setSelectedChain(null)
				setSelectedProtocol(null)
				setSelectedChartType('llamascript')
			} else if (editItem.kind === 'chart') {
				setSelectedMainTab('chart')
				setSelectedChartTab(editItem.protocol ? 'protocol' : 'chain')
				setSelectedChain(editItem.chain || null)
				setSelectedProtocol(editItem.protocol || null)
				setSelectedChartType(editItem.type)
			} else if (editItem.kind === 'multi') {
				setSelectedMainTab('composer')
				setComposerItems(editItem.items)
				setComposerChartName(editItem.name || '')
				if (editItem.items.length > 0) {
					const firstItem = editItem.items[0]
					setComposerSubType(firstItem.protocol ? 'protocol' : 'chain')
				}
			} else if (editItem.kind === 'table') {
				setSelectedMainTab('table')
				setSelectedChains(editItem.chains || [])
				if (editItem.tableType === 'dataset') {
					setSelectedTableType(editItem.datasetType || 'stablecoins')
					setSelectedDatasetChain(editItem.datasetChain || null)
					if (editItem.datasetType === 'token-usage') {
						setSelectedTokens(editItem.tokenSymbols || [])
						setIncludeCex(editItem.includeCex || false)
					}
				} else {
					setSelectedTableType('protocols')
				}
			} else if (editItem.kind === 'text') {
				setSelectedMainTab('text')
				setTextTitle(editItem.title || '')
				setTextContent(editItem.content)
			}
		} else {
			// Reset state when not editing
			setSelectedMainTab('chart')
			setSelectedChartTab('chain')
			setComposerItems([])
			setComposerSubType('chain')
			setComposerChartName('')
			setComposerScript('')
			setSelectedChain(null)
			setSelectedChains([])
			setSelectedProtocol(null)
			setSelectedChartType('tvl')
			setTextTitle('')
			setTextContent('')
			setSelectedTableType('protocols')
			setSelectedDatasetChain(null)
			setSelectedTokens([])
			setIncludeCex(false)
		}
	}, [editItem, isOpen])

	const resetState = () => {
		setComposerItems([])
		setComposerChartName('')
		setComposerScript('')
		setTextTitle('')
		setTextContent('')
		setSelectedChartType('tvl')
		setSelectedChain(null)
		setSelectedChains([])
		setSelectedProtocol(null)
		setSelectedTableType('protocols')
		setSelectedDatasetChain(null)
		setSelectedTokens([])
		setIncludeCex(false)
	}

	const state: ModalState = {
		selectedMainTab,
		selectedChartTab,
		composerItems,
		composerSubType,
		composerChartName,
		composerScript,
		selectedChain,
		selectedChains,
		selectedProtocol,
		selectedChartType,
		textTitle,
		textContent,
		selectedTableType,
		selectedDatasetChain,
		selectedTokens,
		includeCex
	}

	return {
		state,
		actions: {
			setSelectedMainTab,
			setSelectedChartTab,
			setComposerItems,
			setComposerSubType,
			setComposerChartName,
			setComposerScript,
			setSelectedChain,
			setSelectedChains,
			setSelectedProtocol,
			setSelectedChartType,
			setTextTitle,
			setTextContent,
			setSelectedTableType,
			setSelectedDatasetChain,
			setSelectedTokens,
			setIncludeCex
		},
		resetState
	}
}
