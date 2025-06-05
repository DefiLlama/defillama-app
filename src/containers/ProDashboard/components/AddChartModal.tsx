import { useState, useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { CHART_TYPES, Chain, Protocol, getProtocolChartTypes, getChainChartTypes } from '../types'
import { useProtocolsAndChains, useAvailableChartTypes } from '../queries'
import { sluggify } from '~/utils/cache-client'
import { LoadingSpinner } from './LoadingSpinner'
import { ItemSelect } from './ItemSelect'

interface AddChartModalProps {
	isOpen: boolean
	onClose: () => void
	onAddChart: (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => void
	onAddTable: (chain: string) => void
	chains: Chain[]
	chainsLoading: boolean
}


export function AddChartModal({ isOpen, onClose, onAddChart, onAddTable, chainsLoading }: AddChartModalProps) {
	const [selectedItemType, setSelectedItemType] = useState<'chain' | 'protocol' | 'table'>('chain')
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
	const [selectedChartType, setSelectedChartType] = useState<string>('tvl')

	const { data: { protocols = [], chains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()
	
	const selectedProtocolData = useMemo(() => 
		protocols.find((p: Protocol) => p.slug === selectedProtocol), 
		[protocols, selectedProtocol]
	)

	const { availableChartTypes, isLoading: chartTypesLoading } = useAvailableChartTypes(
		selectedItemType === 'chain' ? selectedChain : selectedProtocol,
		selectedItemType === 'table' ? 'chain' : selectedItemType,
		selectedProtocolData?.geckoId
	)

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

	const handleSubmit = () => {
		if (selectedItemType === 'chain' && selectedChain) {
			onAddChart(selectedChain, selectedChartType, 'chain')
		} else if (selectedItemType === 'protocol' && selectedProtocol) {
			const protocol = protocols.find((p: Protocol) => p.slug === selectedProtocol)
			onAddChart(selectedProtocol, selectedChartType, 'protocol', protocol?.geckoId)
		} else if (selectedItemType === 'table' && selectedChain) {
			onAddTable(selectedChain)
		}
		onClose()
		setSelectedChartType('tvl')
		setSelectedChain(null)
		setSelectedProtocol(null)
	}

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 bg-[var(--app-bg)]/90 backdrop-blur-sm flex justify-center items-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-[#070e0f] border border-white/30 p-6 max-w-2xl w-full shadow-xl"
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

				<div className="space-y-5">
					<div className="flex gap-0 mb-5">
						<button
							className={`px-4 py-3 text-sm font-medium border w-full transition-colors duration-200 ${
								selectedItemType === 'chain'
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
							}`}
							onClick={() => {
								setSelectedItemType('chain')
								setSelectedChain(null)
								setSelectedProtocol(null)
							}}
						>
							Chain
						</button>
						<button
							className={`px-4 py-3 text-sm font-medium border w-full transition-colors duration-200 ${
								selectedItemType === 'protocol'
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
							}`}
							onClick={() => {
								setSelectedItemType('protocol')
								setSelectedChain(null)
								setSelectedProtocol(null)
							}}
						>
							Protocol
						</button>
						<button
							className={`px-4 py-3 text-sm font-medium border w-full transition-colors duration-200 ${
								selectedItemType === 'table'
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
							}`}
							onClick={() => {
								setSelectedItemType('table')
								setSelectedChain(null)
								setSelectedProtocol(null)
							}}
						>
							Table
						</button>
					</div>

					{selectedItemType === 'chain' && (
						<ItemSelect
							label="Select Chain"
							options={chainOptions}
							selectedValue={selectedChain}
							onChange={handleChainChange}
							isLoading={chainsLoading}
							placeholder="Select a chain..."
							itemType="chain"
						/>
					)}

					{selectedItemType === 'table' && (
						<ItemSelect
							label="Select Chain"
							options={chainOptions}
							selectedValue={selectedChain}
							onChange={(option: any) => setSelectedChain(option.value)}
							isLoading={chainsLoading}
							placeholder="Select a chain..."
							itemType="chain"
						/>
					)}

					{selectedItemType === 'protocol' && (
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

					{selectedItemType !== 'table' && (
						<div>
							<label className="block mb-3 text-sm font-medium text-[var(--text2)]">Chart Type</label>
							{chartTypesLoading ? (
								<div className="flex items-center justify-center h-10">
									<LoadingSpinner size="sm" />
								</div>
							) : (
								<div className="grid grid-cols-2 gap-0">
									{(selectedItemType === 'chain' ? chainChartTypes : protocolChartTypes)
										.filter((key) => availableChartTypes.includes(key))
										.map((key) => {
											const { title } = CHART_TYPES[key]
											return (
												<button
													key={key}
													className={`px-3 py-3 text-sm font-medium border transition-colors duration-200 ${
														selectedChartType === key
															? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
															: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
													}`}
													onClick={() => setSelectedChartType(key)}
													disabled={chartTypesLoading}
												>
													{title}
												</button>
											)
										})}
								</div>
							)}
						</div>
					)}

					<div className="flex justify-end mt-7">
						<button
							className="px-6 py-3 bg-[var(--primary1)] text-white font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-md"
							onClick={handleSubmit}
							disabled={
								chartTypesLoading ||
								(selectedItemType === 'chain' && !selectedChain) ||
								(selectedItemType === 'protocol' && !selectedProtocol) ||
								(selectedItemType === 'table' && !selectedChain)
							}
						>
							{selectedItemType === 'table' ? 'Add Table' : 'Add Chart'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
