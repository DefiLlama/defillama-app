import { useState, useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { CHART_TYPES, Chain, Protocol, getProtocolChartTypes, getChainChartTypes, ChartConfig } from '../types'
import { useAvailableChartTypes, useChartData } from '../queries'
import { sluggify } from '~/utils/cache-client'
import { LoadingSpinner } from './LoadingSpinner'
import { ItemSelect } from './ItemSelect'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { reactSelectStyles } from '../utils/reactSelectStyles'
import { ChartPreview } from './ChartPreview'
import { useProDashboard } from '../ProDashboardAPIContext'

interface AddChartModalProps {
	isOpen: boolean
	onClose: () => void
}

export function AddChartModal({
	isOpen,
	onClose
}: AddChartModalProps) {
	const [selectedMainTab, setSelectedMainTab] = useState<'chart' | 'composer' | 'table' | 'text'>('chart')
	const [selectedChartTab, setSelectedChartTab] = useState<'chain' | 'protocol'>('chain')
	const [composerItems, setComposerItems] = useState<ChartConfig[]>([])
	const [composerSubType, setComposerSubType] = useState<'chain' | 'protocol'>('chain')
	const [composerChartName, setComposerChartName] = useState<string>('')
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
	const [selectedChartType, setSelectedChartType] = useState<string>('tvl')
	const [textTitle, setTextTitle] = useState<string>('')
	const [textContent, setTextContent] = useState<string>('')

	const { 
		protocols, 
		chains, 
		protocolsLoading,
		timePeriod,
		handleAddChart, 
		handleAddTable, 
		handleAddMultiChart,
		handleAddText 
	} = useProDashboard()

	const selectedProtocolData = useMemo(
		() => protocols.find((p: Protocol) => p.slug === selectedProtocol),
		[protocols, selectedProtocol]
	)

	const getCurrentItemType = () => {
		if (selectedMainTab === 'chart') {
			return selectedChartTab
		} else if (selectedMainTab === 'composer') {
			return composerSubType
		} else {
			return 'chain'
		}
	}

	const getCurrentSelectedItem = () => {
		if (selectedMainTab === 'chart') {
			return selectedChartTab === 'chain' ? selectedChain : selectedProtocol
		} else if (selectedMainTab === 'composer') {
			return composerSubType === 'chain' ? selectedChain : selectedProtocol
		} else {
			return selectedChain
		}
	}

	const { availableChartTypes, isLoading: chartTypesLoading } = useAvailableChartTypes(
		getCurrentSelectedItem(),
		selectedMainTab === 'table' ? 'chain' : getCurrentItemType(),
		selectedProtocolData?.geckoId,
		timePeriod
	)

	const shouldFetchPreviewData = selectedMainTab === 'chart' && getCurrentSelectedItem() && selectedChartType
	const previewChartData = useChartData(
		selectedChartType,
		getCurrentItemType(),
		getCurrentSelectedItem() || '',
		selectedProtocolData?.geckoId,
		timePeriod
	)

	const showPreview = shouldFetchPreviewData && availableChartTypes.includes(selectedChartType)

	const chainOptions = useMemo(
		() =>
			chains.map((chain: Chain) => ({
				value: chain.name,
				label: chain.name
			})),
		[chains]
	)

	const protocolOptions = useMemo(
		() =>
			protocols.map((protocol: Protocol) => ({
				value: sluggify(protocol.name),
				label: protocol.name,
				logo: protocol.logo
			})),
		[protocols]
	)

	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()

	const handleChainChange = (option: any) => {
		setSelectedChain(option.value)
		setSelectedProtocol(null)
		setSelectedChartType('tvl')
	}

	const handleProtocolChange = (option: any) => {
		setSelectedProtocol(option.value)
		setSelectedChain(null)
		setSelectedChartType('tvl')
	}

	const handleAddToComposer = () => {
		if (composerSubType === 'chain' && selectedChain) {
			const newChart: ChartConfig = {
				id: `${selectedChain}-${selectedChartType}-${Date.now()}`,
				kind: 'chart',
				chain: selectedChain,
				type: selectedChartType,
				grouping: 'day'
			}
			setComposerItems((prev) => [...prev, newChart])
		} else if (composerSubType === 'protocol' && selectedProtocol) {
			const protocol = protocols.find((p: Protocol) => p.slug === selectedProtocol)
			const newChart: ChartConfig = {
				id: `${selectedProtocol}-${selectedChartType}-${Date.now()}`,
				kind: 'chart',
				protocol: selectedProtocol,
				chain: '',
				type: selectedChartType,
				grouping: 'day',
				geckoId: protocol?.geckoId
			}
			setComposerItems((prev) => [...prev, newChart])
		}
		setSelectedChain(null)
		setSelectedProtocol(null)
		setSelectedChartType('tvl')
	}

	const handleRemoveFromComposer = (id: string) => {
		setComposerItems((prev) => prev.filter((item) => item.id !== id))
	}

	const handleSubmit = () => {
		if (selectedMainTab === 'composer' && composerItems.length > 0) {
			handleAddMultiChart(composerItems, composerChartName.trim() || undefined)
			setComposerItems([])
			setComposerChartName('')
		} else if (selectedMainTab === 'chart' && selectedChartTab === 'chain' && selectedChain) {
			handleAddChart(selectedChain, selectedChartType, 'chain')
		} else if (selectedMainTab === 'chart' && selectedChartTab === 'protocol' && selectedProtocol) {
			const protocol = protocols.find((p: Protocol) => p.slug === selectedProtocol)
			handleAddChart(selectedProtocol, selectedChartType, 'protocol', protocol?.geckoId)
		} else if (selectedMainTab === 'table' && selectedChain) {
			handleAddTable(selectedChain)
		} else if (selectedMainTab === 'text' && textContent.trim()) {
			handleAddText(textTitle.trim() || undefined, textContent.trim())
			setTextTitle('')
			setTextContent('')
		}
		onClose()
		setSelectedChartType('tvl')
		setSelectedChain(null)
		setSelectedProtocol(null)
	}

	const handleMainTabChange = (tab: 'chart' | 'composer' | 'table' | 'text') => {
		setSelectedMainTab(tab)
		setSelectedChain(null)
		setSelectedProtocol(null)
		setSelectedChartType('tvl')
	}

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 bg-[var(--app-bg)]/90 backdrop-blur-sm flex justify-center items-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-[#070e0f] border border-white/30 p-6 max-w-4xl w-full shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-semibold text-[var(--text1)]">Add Item</h2>
					<button
						onClick={onClose}
						className="p-1.5 hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text1)] rounded-md"
					>
						<Icon name="x" height={20} width={20} />
					</button>
				</div>

				<div className="grid grid-cols-4 gap-0 mb-6">
					<button
						className={`px-4 py-3 text-sm font-medium border transition-colors duration-200 ${
							selectedMainTab === 'chart'
								? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
								: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
						}`}
						onClick={() => handleMainTabChange('chart')}
					>
						Chart <span className="text-[var(--text3)]">(Single)</span>
					</button>
					<button
						className={`px-4 py-3 text-sm font-medium border transition-colors duration-200 ${
							selectedMainTab === 'composer'
								? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
								: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
						}`}
						onClick={() => handleMainTabChange('composer')}
					>
						Chart Composer <span className="text-[var(--text3)]">(Multi)</span>
					</button>
					<button
						className={`px-4 py-3 text-sm font-medium border transition-colors duration-200 ${
							selectedMainTab === 'table'
								? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
								: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
						}`}
						onClick={() => handleMainTabChange('table')}
					>
						Table <span className="text-[var(--text3)]">(Dataset)</span>
					</button>
					<button
						className={`px-4 py-3 text-sm font-medium border transition-colors duration-200 ${
							selectedMainTab === 'text'
								? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
								: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
						}`}
						onClick={() => handleMainTabChange('text')}
					>
						Text <span className="text-[var(--text3)]">(Markdown)</span>
					</button>
				</div>

				<div className="space-y-5">
					{selectedMainTab === 'chart' && (
						<div className="flex gap-4 h-96">
							<div className="flex-1 border border-white/20 p-4 space-y-4">
								<div className="grid grid-cols-2 gap-0">
									<button
										className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
											selectedChartTab === 'chain'
												? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
												: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
										}`}
										onClick={() => {
											setSelectedChartTab('chain')
											setSelectedChain(null)
											setSelectedProtocol(null)
											setSelectedChartType('tvl')
										}}
									>
										Chain
									</button>
									<button
										className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
											selectedChartTab === 'protocol'
												? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
												: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
										}`}
										onClick={() => {
											setSelectedChartTab('protocol')
											setSelectedChain(null)
											setSelectedProtocol(null)
											setSelectedChartType('tvl')
										}}
									>
										Protocol
									</button>
								</div>

								{selectedChartTab === 'chain' && (
									<ItemSelect
										label="Select Chain"
										options={chainOptions}
										selectedValue={selectedChain}
										onChange={handleChainChange}
										isLoading={protocolsLoading}
										placeholder="Select a chain..."
										itemType="chain"
									/>
								)}

								{selectedChartTab === 'protocol' && (
									<ItemSelect
										label="Select Protocol"
										options={protocolOptions}
										selectedValue={selectedProtocol}
										onChange={handleProtocolChange}
										isLoading={protocolsLoading}
										placeholder="Select a protocol..."
										itemType="protocol"
									/>
								)}

								{(selectedChain || selectedProtocol) && (
									<div className="mb-4">
										<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Chart Type</label>
										{chartTypesLoading ? (
											<div className="flex items-center justify-center h-10">
												<LoadingSpinner size="sm" />
											</div>
										) : (
											<ReactSelect
												options={(selectedChartTab === 'chain' ? chainChartTypes : protocolChartTypes)
													.filter((key) => availableChartTypes.includes(key))
													.map((key) => ({
														value: key,
														label: CHART_TYPES[key]?.title
													}))}
												value={(selectedChartTab === 'chain' ? chainChartTypes : protocolChartTypes)
													.filter((key) => availableChartTypes.includes(key))
													.map((key) => ({
														value: key,
														label: CHART_TYPES[key]?.title
													}))
													.find((option) => option.value === selectedChartType)}
												onChange={(option: any) => setSelectedChartType(option.value)}
												placeholder="Select chart type..."
												className="w-full"
												styles={reactSelectStyles}
											/>
										)}
									</div>
								)}
							</div>

							<div className="flex-1 border border-white/20">
								<div className="text-sm font-medium text-[var(--text2)] mb-3 mt-4 ml-4">Preview</div>
								{showPreview ? (
									<div className="h-full  bg-[#070e0f]/50 p-2">
										<ChartPreview
											data={previewChartData.data}
											chartType={selectedChartType}
											isLoading={previewChartData.isLoading}
											hasError={previewChartData.isError}
											itemName={
												selectedChartTab === 'chain'
													? selectedChain || ''
													: selectedProtocolData?.name || selectedProtocol || ''
											}
										/>
									</div>
								) : (
									<div className="flex items-center justify-center h-full text-[var(--text3)] text-center">
										<div>
											<Icon name="bar-chart-2" height={36} width={36} className="mb-1 mx-auto" />
											<div className="text-xs">Select a chart to see preview</div>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{selectedMainTab === 'composer' && (
						<div className="space-y-4">
							<div>
								<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Chart Name</label>
								<input
									type="text"
									value={composerChartName}
									onChange={(e) => setComposerChartName(e.target.value)}
									placeholder="Enter chart name..."
									className="w-full px-3 py-2 border border-white/20 text-[var(--text1)] placeholder-[var(--text3)] focus:border-[var(--primary1)] focus:outline-none"
									style={{ backgroundColor: '#070e0f' }}
								/>
							</div>

							<div className="flex gap-4 h-96">
								<div className="flex-[7] border border-white/20 p-4 space-y-4">
									<div className="grid grid-cols-2 gap-0">
										<button
											className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
												composerSubType === 'chain'
													? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
													: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
											}`}
											onClick={() => {
												setComposerSubType('chain')
												setSelectedChain(null)
												setSelectedProtocol(null)
												setSelectedChartType('tvl')
											}}
										>
											Chain
										</button>
										<button
											className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
												composerSubType === 'protocol'
													? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
													: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
											}`}
											onClick={() => {
												setComposerSubType('protocol')
												setSelectedChain(null)
												setSelectedProtocol(null)
												setSelectedChartType('tvl')
											}}
										>
											Protocol
										</button>
									</div>

									{composerSubType === 'chain' && (
										<ItemSelect
											label="Select Chain"
											options={chainOptions}
											selectedValue={selectedChain}
											onChange={handleChainChange}
											isLoading={protocolsLoading}
											placeholder="Select a chain..."
											itemType="chain"
										/>
									)}

									{composerSubType === 'protocol' && (
										<ItemSelect
											label="Select Protocol"
											options={protocolOptions}
											selectedValue={selectedProtocol}
											onChange={handleProtocolChange}
											isLoading={protocolsLoading}
											placeholder="Select a protocol..."
											itemType="protocol"
										/>
									)}

									{(selectedChain || selectedProtocol) && (
										<div className="mb-4">
											<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Chart Type</label>
											{chartTypesLoading ? (
												<div className="flex items-center justify-center h-10">
													<LoadingSpinner size="sm" />
												</div>
											) : (
												<ReactSelect
													options={(composerSubType === 'chain' ? chainChartTypes : protocolChartTypes)
														.filter((key) => availableChartTypes.includes(key))
														.map((key) => ({
															value: key,
															label: CHART_TYPES[key]?.title
														}))}
													value={(composerSubType === 'chain' ? chainChartTypes : protocolChartTypes)
														.filter((key) => availableChartTypes.includes(key))
														.map((key) => ({
															value: key,
															label: CHART_TYPES[key]?.title
														}))
														.find((option) => option.value === selectedChartType)}
													onChange={(option: any) => setSelectedChartType(option.value)}
													placeholder="Select chart type..."
													className="w-full"
													styles={reactSelectStyles}
												/>
											)}
										</div>
									)}

									{/* Add Chart Button */}
									<button
										className="w-full px-4 py-3 bg-[var(--primary1)] text-white text-sm font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 border border-[var(--primary1)] transition-colors duration-200"
										onClick={handleAddToComposer}
										disabled={
											(composerSubType === 'chain' && !selectedChain) ||
											(composerSubType === 'protocol' && !selectedProtocol) ||
											!selectedChartType
										}
									>
										Add Chart
									</button>
								</div>

								<div className="flex-[3] border border-white/20 p-4">
									<div className="text-sm font-medium text-[var(--text2)] mb-3">Charts ({composerItems.length})</div>
									<div className="space-y-2 overflow-y-auto max-h-80 thin-scrollbar">
										{composerItems.length === 0 ? (
											<div className="text-xs text-[var(--text3)] text-center py-8">No charts added yet</div>
										) : (
											composerItems.map((item) => (
												<div
													key={item.id}
													className="flex items-center justify-between p-2 text-xs border border-white/10"
													style={{ backgroundColor: '#070e0f' }}
												>
													<div className="flex-1 min-w-0">
														<div className="font-medium text-[var(--text1)] truncate">
															{item.protocol || item.chain}
														</div>
														<div className="text-[var(--text3)] truncate">{CHART_TYPES[item.type]?.title}</div>
													</div>
													<button
														onClick={() => handleRemoveFromComposer(item.id)}
														className="ml-2 p-1 text-[var(--text3)] hover:text-[var(--text1)] hover:bg-[var(--bg2)] border border-white/20 transition-colors duration-200"
													>
														<Icon name="x" height={12} width={12} />
													</button>
												</div>
											))
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{selectedMainTab === 'table' && (
						<ItemSelect
							label="Select Chain"
							options={chainOptions}
							selectedValue={selectedChain}
							onChange={(option: any) => setSelectedChain(option.value)}
							isLoading={protocolsLoading}
							placeholder="Select a chain..."
							itemType="chain"
						/>
					)}

					{selectedMainTab === 'text' && (
						<div className="space-y-4">
							<div>
								<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Title (Optional)</label>
								<input
									type="text"
									value={textTitle}
									onChange={(e) => setTextTitle(e.target.value)}
									placeholder="Enter text title..."
									className="w-full px-3 py-2 border border-white/20 text-[var(--text1)] placeholder-[var(--text3)] focus:border-[var(--primary1)] focus:outline-none"
									style={{ backgroundColor: '#070e0f' }}
								/>
							</div>
							<div>
								<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Content (Markdown)</label>
								<textarea
									value={textContent}
									onChange={(e) => setTextContent(e.target.value)}
									placeholder="Enter markdown content..."
									rows={12}
									className="w-full px-3 py-2 border border-white/20 text-[var(--text1)] placeholder-[var(--text3)] focus:border-[var(--primary1)] focus:outline-none resize-none font-mono text-sm"
									style={{ backgroundColor: '#070e0f' }}
								/>
								<div className="mt-2 text-xs text-[var(--text3)]">
									Supports markdown: **bold**, *italic*, # headers, - lists, `code`, [links](url)
								</div>
							</div>
						</div>
					)}

					<div className="flex justify-end mt-7">
						<button
							className="px-6 py-3 bg-[var(--primary1)] text-white font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
							onClick={handleSubmit}
							disabled={
								chartTypesLoading ||
								(selectedMainTab === 'chart' && selectedChartTab === 'chain' && !selectedChain) ||
								(selectedMainTab === 'chart' && selectedChartTab === 'protocol' && !selectedProtocol) ||
								(selectedMainTab === 'table' && !selectedChain) ||
								(selectedMainTab === 'composer' && composerItems.length === 0) ||
								(selectedMainTab === 'text' && !textContent.trim())
							}
						>
							{selectedMainTab === 'table'
								? 'Add Table'
								: selectedMainTab === 'composer'
								? 'Add Multi-Chart'
								: selectedMainTab === 'text'
								? 'Add Text'
								: 'Add Chart'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
