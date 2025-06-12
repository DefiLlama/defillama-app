import { useState, useEffect } from 'react'
import { ModalState, MainTabType, ChartTabType } from './types'
import { DashboardItemConfig, ChartConfig } from '../../types'

export function useModalState(editItem?: DashboardItemConfig | null, isOpen?: boolean) {
	const [selectedMainTab, setSelectedMainTab] = useState<MainTabType>('chart')
	const [selectedChartTab, setSelectedChartTab] = useState<ChartTabType>('chain')
	const [composerItems, setComposerItems] = useState<ChartConfig[]>([])
	const [composerSubType, setComposerSubType] = useState<ChartTabType>('chain')
	const [composerChartName, setComposerChartName] = useState<string>('')
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [selectedChains, setSelectedChains] = useState<string[]>([])
	const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
	const [selectedChartType, setSelectedChartType] = useState<string>('tvl')
	const [textTitle, setTextTitle] = useState<string>('')
	const [textContent, setTextContent] = useState<string>('')

	// Initialize state based on editItem
	useEffect(() => {
		if (editItem) {
			if (editItem.kind === 'chart') {
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
			setSelectedChain(null)
			setSelectedChains([])
			setSelectedProtocol(null)
			setSelectedChartType('tvl')
			setTextTitle('')
			setTextContent('')
		}
	}, [editItem, isOpen])

	const resetState = () => {
		setComposerItems([])
		setComposerChartName('')
		setTextTitle('')
		setTextContent('')
		setSelectedChartType('tvl')
		setSelectedChain(null)
		setSelectedChains([])
		setSelectedProtocol(null)
	}

	const state: ModalState = {
		selectedMainTab,
		selectedChartTab,
		composerItems,
		composerSubType,
		composerChartName,
		selectedChain,
		selectedChains,
		selectedProtocol,
		selectedChartType,
		textTitle,
		textContent
	}

	return {
		state,
		actions: {
			setSelectedMainTab,
			setSelectedChartTab,
			setComposerItems,
			setComposerSubType,
			setComposerChartName,
			setSelectedChain,
			setSelectedChains,
			setSelectedProtocol,
			setSelectedChartType,
			setTextTitle,
			setTextContent
		},
		resetState
	}
}
