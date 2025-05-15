import { useState, useMemo, useRef } from 'react'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { Icon } from '~/components/Icon'
import { chainIconUrl } from '~/utils'
import { CHART_TYPES, Chain, Protocol } from '../types'
import { useProtocolsAndChains } from '../queries'
import { createFilter } from 'react-select'
import { sluggify } from '~/utils/cache-client'
import { useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

interface AddChartModalProps {
	isOpen: boolean
	onClose: () => void
	onAddChart: (item: string, chartType: string, itemType: 'chain' | 'protocol') => void
	onAddTable: (chain: string) => void
	chains: Chain[]
	chainsLoading: boolean
}

const CustomChainOption = ({ innerProps, label, data }) => (
	<div {...innerProps} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }}>
		<img
			src={chainIconUrl(label)}
			alt={label}
			style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
		/>
		{label}
	</div>
)

const CustomProtocolOption = ({ innerProps, label, data }) => (
	<div {...innerProps} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }}>
		{data.logo && (
			<img
				src={data.logo}
				alt={label}
				style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
			/>
		)}
		{!data.logo && (
			<div
				style={{
					width: '20px',
					height: '20px',
					marginRight: '10px',
					borderRadius: '50%',
					backgroundColor: 'var(--bg2)'
				}}
			/>
		)}
		{label}
	</div>
)

function VirtualizedMenuList(props) {
	const { options, children, maxHeight, getValue } = props
	const listRef = useRef()
	const itemCount = options.length
	const virtualizer = useVirtualizer({
		count: itemCount,
		getScrollElement: () => listRef.current,
		estimateSize: () => 40
	})
	return (
		<div
			ref={listRef}
			style={{
				maxHeight,
				overflowY: 'auto',
				position: 'relative'
			}}
		>
			<div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
				{virtualizer.getVirtualItems().map((virtualRow) => (
					<div
						key={virtualRow.key}
						data-index={virtualRow.index}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							transform: `translateY(${virtualRow.start}px)`
						}}
					>
						{children[virtualRow.index]}
					</div>
				))}
			</div>
		</div>
	)
}

export function AddChartModal({ isOpen, onClose, onAddChart, onAddTable, chainsLoading }: AddChartModalProps) {
	const [selectedItemType, setSelectedItemType] = useState<'chain' | 'protocol' | 'table'>('chain')
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
	const [selectedChartType, setSelectedChartType] = useState<string>('tvl')
	const [availableChartTypes, setAvailableChartTypes] = useState<string[]>([])
	const [chartTypesLoading, setChartTypesLoading] = useState(false)

	const queryClient = useQueryClient()
	const { data: { protocols = [], chains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()

	const chainOptions = useMemo(
		() =>
			chains.map((chain) => ({
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

	const protocolChartTypes = [
		'tvl',
		'volume',
		'fees',
		'revenue',
		'perpsVolume',
		'optionsVolume',
		'aggregatorsVolume',
		'perpsAggregatorsVolume',
		'bridgeAggregatorsVolume'
	]

	const chainChartTypes = ['tvl', 'volume', 'fees', 'users', 'txs']

	const prefetchChartTypes = async (itemType: 'chain' | 'protocol', item: string) => {
		setChartTypesLoading(true)
		const chartTypes = itemType === 'chain' ? chainChartTypes : protocolChartTypes
		const ChainCharts = require('../services/ChainCharts').default
		const ProtocolCharts = require('../services/ProtocolCharts').default
		await Promise.all(
			chartTypes.map(async (type) => {
				let data
				if (itemType === 'chain') {
					data = queryClient.getQueryData([type, item])
					if (!Array.isArray(data) || data.length === 0) {
						await queryClient.prefetchQuery({ queryKey: [type, item], queryFn: () => ChainCharts[type](item) })
					}
				} else {
					data = queryClient.getQueryData([type, undefined, item])
					if (!Array.isArray(data) || data.length === 0) {
						await queryClient.prefetchQuery({
							queryKey: [type, undefined, item],
							queryFn: () => ProtocolCharts[type](item)
						})
					}
				}
			})
		)
		const available = chartTypes.filter((type) => {
			let data
			if (itemType === 'chain') {
				data = queryClient.getQueryData([type, item])
			} else {
				data = queryClient.getQueryData([type, undefined, item])
			}
			return Array.isArray(data) && data.length > 0
		})
		setAvailableChartTypes(available)
		setChartTypesLoading(false)
	}

	const handleChainChange = async (option: any) => {
		setSelectedChain(option.value)
		setSelectedProtocol(null)
		setSelectedChartType('tvl')
		await prefetchChartTypes('chain', option.value)
	}

	const handleProtocolChange = async (option: any) => {
		setSelectedProtocol(option.value)
		setSelectedChain(null)
		setSelectedChartType('tvl')
		await prefetchChartTypes('protocol', option.value)
	}

	const handleSubmit = () => {
		if (selectedItemType === 'chain' && selectedChain) {
			onAddChart(selectedChain, selectedChartType, 'chain')
		} else if (selectedItemType === 'protocol' && selectedProtocol) {
			onAddChart(selectedProtocol, selectedChartType, 'protocol')
		} else if (selectedItemType === 'table' && selectedChain) {
			onAddTable(selectedChain)
		}
		onClose()
		setSelectedChartType('tvl')
		setSelectedChain(null)
		setSelectedProtocol(null)
		setAvailableChartTypes([])
	}

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 bg-[var(--app-bg)]/90 backdrop-blur-sm flex justify-center items-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-[#070e0f] border border-white/30 p-6 max-w-md w-full shadow-xl"
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
								setAvailableChartTypes([])
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
								setAvailableChartTypes([])
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
								setAvailableChartTypes([])
							}}
						>
							Table
						</button>
					</div>

					{selectedItemType === 'chain' && (
						<div>
							<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Select Chain</label>
							{chainsLoading ? (
								<div className="flex items-center justify-center h-10">
									<div className="animate-spin h-5 w-5 border-b-2 border-[var(--primary1)]"></div>
								</div>
							) : (
								<ReactSelect
									options={chainOptions}
									value={chainOptions.find((option) => option.value === selectedChain)}
									onChange={handleChainChange}
									components={{ Option: CustomChainOption, MenuList: VirtualizedMenuList }}
									placeholder="Select a chain..."
									className="w-full"
								/>
							)}
						</div>
					)}

					{selectedItemType === 'table' && (
						<div>
							<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Select Chain</label>
							{chainsLoading ? (
								<div className="flex items-center justify-center h-10">
									<div className="animate-spin h-5 w-5 border-b-2 border-[var(--primary1)]"></div>
								</div>
							) : (
								<ReactSelect
									options={chainOptions}
									value={chainOptions.find((option) => option.value === selectedChain)}
									onChange={(option: any) => setSelectedChain(option.value)}
									components={{ Option: CustomChainOption, MenuList: VirtualizedMenuList }}
									placeholder="Select a chain..."
									className="w-full"
								/>
							)}
						</div>
					)}

					{selectedItemType === 'protocol' && (
						<div>
							<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Select Protocol</label>
							{protocolsLoading ? (
								<div className="flex items-center justify-center h-10">
									<div className="animate-spin h-5 w-5 border-b-2 border-[var(--primary1)]"></div>
								</div>
							) : (
								<ReactSelect
									options={protocolOptions}
									value={protocolOptions.find((option) => option.value === selectedProtocol)}
									onChange={handleProtocolChange}
									components={{ Option: CustomProtocolOption, MenuList: VirtualizedMenuList }}
									placeholder="Select a protocol..."
									className="w-full"
									filterOption={createFilter({ ignoreAccents: false, ignoreCase: false })}
								/>
							)}
						</div>
					)}

					{selectedItemType !== 'table' && (
						<div>
							<label className="block mb-3 text-sm font-medium text-[var(--text2)]">Chart Type</label>
							{chartTypesLoading ? (
								<div className="flex items-center justify-center h-10">
									<div className="animate-spin h-5 w-5 border-b-2 border-[var(--primary1)]"></div>
								</div>
							) : (
								<div className="grid grid-cols-3 gap-0">
									{(selectedItemType === 'chain' ? chainChartTypes : protocolChartTypes)
										.filter((key) => availableChartTypes.includes(key))
										.map((key, index, array) => {
											const { title, color } = CHART_TYPES[key]
											return (
												<button
													key={key}
													className={`px-2 py-3 text-sm font-medium border transition-colors duration-200 ${
														selectedChartType === key
															? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
															: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
													}`}
													onClick={() => setSelectedChartType(key)}
													disabled={chartTypesLoading}
												>
													{title.split(' ')[0]}
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
