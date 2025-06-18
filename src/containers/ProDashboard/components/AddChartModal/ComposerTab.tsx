import { Icon } from '~/components/Icon'
import { ItemSelect } from '../ItemSelect'
import { ChartTypeSelector } from './ChartTypeSelector'
import { LoadingSpinner } from '../LoadingSpinner'
import { ChartTabType } from './types'
import { ChartConfig, CHART_TYPES, getProtocolChartTypes, getChainChartTypes } from '../../types'
import React, { useState, useEffect } from 'react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/themes/prism.css'
import { parseLlamaScript } from '~/containers/ProDashboard/utils/llamascript.chevrotain'
import { interpretLlamaScriptCST } from '~/containers/ProDashboard/utils/llamascript.interpreter'
import { ChartPreview } from '../ChartPreview'

Prism.languages.llamascript = {
	comment: /\/\/.*/,
	string: {
		pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/,
		greedy: true
	},
	number: /\b\d+(\.\d+)?\b/,
	keyword: /\b(plot|AND|OR|NOT|protocol|chain|token)\b/i,
	function: /\b(ma|ema|diff|pctchange|if|volume|fees|revenue|tvl|mcap|price|medianApy|abs)\b/i,
	constant: /\b(null|true|false)\b/i,
	operator: /==|!=|>=|<=|/,
	punctuation: /[(),.\[\]]/,
	identifier: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/
}

interface ComposerTabProps {
	composerChartName: string
	composerSubType: ChartTabType
	composerItems: ChartConfig[]
	selectedChain: string | null
	selectedProtocol: string | null
	selectedChartType: string
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	availableChartTypes: string[]
	chartTypesLoading: boolean
	protocolsLoading: boolean
	onComposerChartNameChange: (name: string) => void
	onComposerSubTypeChange: (type: ChartTabType) => void
	onChainChange: (option: any) => void
	onProtocolChange: (option: any) => void
	onChartTypeChange: (type: string) => void
	onAddToComposer: () => void
	onRemoveFromComposer: (id: string) => void
	onAddLlamaScriptChart: (chart: { id: string; name: string; llamascript: string }) => void
	selectedTab: 'charts' | 'script'
	onSelectedTabChange: (tab: 'charts' | 'script') => void
	script: string
	onScriptChange: (script: string) => void
	composerScript?: string
	setComposerScript?: (script: string) => void
}

export function ComposerTab({
	composerChartName,
	composerSubType,
	composerItems,
	selectedChain,
	selectedProtocol,
	selectedChartType,
	chainOptions,
	protocolOptions,
	availableChartTypes,
	chartTypesLoading,
	protocolsLoading,
	onComposerChartNameChange,
	onComposerSubTypeChange,
	onChainChange,
	onProtocolChange,
	onChartTypeChange,
	onAddToComposer,
	onRemoveFromComposer,
	onAddLlamaScriptChart,
	selectedTab,
	onSelectedTabChange,
	script,
	onScriptChange,
	composerScript,
	setComposerScript
}: ComposerTabProps) {
	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()

	const [parseErrors, setParseErrors] = useState<any[]>([])
	const [interpreterOutput, setInterpreterOutput] = useState<any>(null)
	const [isRunning, setIsRunning] = useState(false)

	const handleRunScript = async () => {
		setIsRunning(true)
		setParseErrors([])
		setInterpreterOutput(null)
		const result = parseLlamaScript(script)
		setParseErrors(result.parseErrors)
		if (result.parseErrors.length === 0 && result.cst) {
			setInterpreterOutput('loading')
			try {
				const output = await interpretLlamaScriptCST(result.cst)
				setInterpreterOutput(output)
			} catch (err) {
				setInterpreterOutput({ errors: [err?.message || String(err)] })
			}
		} else {
			setInterpreterOutput(null)
		}
		if (result.parseErrors.length > 0) {
			console.warn('LlamaScript parse errors:', result.parseErrors)
		}
		setIsRunning(false)
	}

	const handleEditorKeyDown = (e: React.KeyboardEvent) => {
		if (e.shiftKey && e.key === 'Enter') {
			e.preventDefault()
			handleRunScript()
		}
	}

	const effectiveScript = typeof composerScript === 'string' ? composerScript : script
	const handleScriptChange = (val: string) => {
		onScriptChange(val)
		if (setComposerScript) setComposerScript(val)
	}

	return (
		<div className="space-y-4">
			<div>
				<label className="block mb-2 text-sm font-medium pro-text2">Chart Name</label>
				<input
					type="text"
					value={composerChartName}
					onChange={(e) => onComposerChartNameChange(e.target.value)}
					placeholder="Enter chart name..."
					className="w-full px-3 py-2 border pro-border pro-text1 placeholder-pro-text3 focus:border-[var(--primary1)] focus:outline-none pro-bg2"
				/>
			</div>

			<div className="flex border-b pro-border mb-4">
				<button
					className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
						selectedTab === 'charts'
							? 'border-b-2 border-[var(--primary1)] text-[var(--primary1)]'
							: 'pro-text2 hover:text-[var(--primary1)]'
					}`}
					onClick={() => onSelectedTabChange('charts')}
				>
					Charts
				</button>
				<button
					className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
						selectedTab === 'script'
							? 'border-b-2 border-[var(--primary1)] text-[var(--primary1)]'
							: 'pro-text2 hover:text-[var(--primary1)]'
					}`}
					onClick={() => onSelectedTabChange('script')}
				>
					Script
				</button>
			</div>

			{selectedTab === 'charts' && (
				<div className="flex gap-4 h-96">
					<div className="flex-[7] border pro-border p-4 space-y-4">
						<div className="grid grid-cols-2 gap-0">
							<button
								className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
									composerSubType === 'chain'
										? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
										: 'pro-border pro-hover-bg pro-text2'
								}`}
								onClick={() => onComposerSubTypeChange('chain')}
							>
								Chain
							</button>
							<button
								className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
									composerSubType === 'protocol'
										? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
										: 'pro-border pro-hover-bg pro-text2'
								}`}
								onClick={() => onComposerSubTypeChange('protocol')}
							>
								Protocol
							</button>
						</div>

						{composerSubType === 'chain' && (
							<ItemSelect
								label="Select Chain"
								options={chainOptions}
								selectedValue={selectedChain}
								onChange={onChainChange}
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
								onChange={onProtocolChange}
								isLoading={protocolsLoading}
								placeholder="Select a protocol..."
								itemType="protocol"
							/>
						)}

						{(selectedChain || selectedProtocol) && (
							<ChartTypeSelector
								selectedChartType={selectedChartType}
								availableChartTypes={availableChartTypes}
								chartTypes={composerSubType === 'chain' ? chainChartTypes : protocolChartTypes}
								isLoading={chartTypesLoading}
								onChange={onChartTypeChange}
							/>
						)}

						<button
							className="w-full px-4 py-3 bg-[var(--primary1)] text-white text-sm font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 border border-[var(--primary1)] transition-colors duration-200"
							onClick={onAddToComposer}
							disabled={
								(composerSubType === 'chain' && !selectedChain) ||
								(composerSubType === 'protocol' && !selectedProtocol) ||
								!selectedChartType
							}
						>
							Add Chart
						</button>
					</div>

					<div className="flex-[3] border pro-border p-4">
						<div className="text-sm font-medium pro-text2 mb-3">Charts ({composerItems.length})</div>
						<div className="space-y-2 overflow-y-auto max-h-80 thin-scrollbar">
							{composerItems.length === 0 ? (
								<div className="text-xs pro-text3 text-center py-8">No charts added yet</div>
							) : (
								composerItems.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between p-2 text-xs border pro-border pro-bg2"
									>
										<div className="flex-1 min-w-0">
											<div className="font-medium pro-text1 truncate">{item.protocol || item.chain}</div>
											<div className="pro-text3 truncate">{CHART_TYPES[item.type]?.title}</div>
										</div>
										<button
											onClick={() => onRemoveFromComposer(item.id)}
											className="ml-2 p-1 pro-text3 hover:pro-text1 pro-hover-bg border pro-border transition-colors duration-200"
										>
											<Icon name="x" height={12} width={12} />
										</button>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			)}

			{selectedTab === 'script' && (
				<div>
					<label className="block mb-2 text-sm font-medium pro-text2">LlamaScript Editor</label>
					<div style={{ maxHeight: 350, overflowY: 'auto' }} className="mb-2 rounded border border-[var(--primary1)]">
						<Editor
							value={effectiveScript}
							onValueChange={handleScriptChange}
							highlight={(code) => Prism.highlight(code, Prism.languages.llamascript, 'llamascript')}
							padding={12}
							style={{
								fontFamily: 'JetBrains Mono, monospace',
								fontSize: 14,
								minHeight: 200,
								background: 'var(--pro-bg2, #1a1a1a)',
								color: 'var(--pro-text1, #fff)',
								borderRadius: 6,
								border: 'none'
							}}
							placeholder="Write your LlamaScript here..."
							onKeyDown={handleEditorKeyDown}
						/>
					</div>
					<button
						className="mt-2 px-4 py-2 bg-[var(--primary1)] text-white text-sm font-medium hover:bg-[var(--primary1-hover)] border border-[var(--primary1)] rounded transition-colors duration-200 disabled:opacity-50"
						onClick={handleRunScript}
						disabled={isRunning}
					>
						{isRunning ? 'Running...' : 'Preview (Shift+Enter)'}
					</button>
					{parseErrors.length > 0 && (
						<div className="mt-2 text-xs text-red-500">
							{parseErrors.map((err, i) => (
								<div key={i}>{err.message}</div>
							))}
						</div>
					)}
					{interpreterOutput === 'loading' && (
						<div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
							<LoadingSpinner size="sm" />
							Evaluating script...
						</div>
					)}
					{interpreterOutput && interpreterOutput.errors && interpreterOutput.errors.length > 0 && (
						<div className="mt-2 text-xs text-yellow-400">
							{interpreterOutput.errors.map((err: string, i: number) => (
								<div key={i}>{err}</div>
							))}
						</div>
					)}
					{interpreterOutput && (
						<>
							{interpreterOutput.plots && interpreterOutput.plots.length > 0 && (
								<div className="mt-6">
									<div className="font-bold mb-2">Chart Preview</div>
									{(() => {
										const multiSeries = interpreterOutput.plots.map((plot: any, i: number) => {
											let arg = plot.evalArgs && plot.evalArgs[0]
											if (arg && typeof arg === 'object' && !Array.isArray(arg) && Object.keys(arg).length === 1) {
												arg = arg[Object.keys(arg)[0]]
											}
											let data: [number, number][] | undefined = undefined
											if (Array.isArray(arg) && arg.length > 0 && Array.isArray(arg[0])) {
												data = arg as [number, number][]
											} else if (typeof arg === 'number') {
												const now = Math.floor(Date.now() / 1000)
												data = Array.from({ length: 30 }, (_, j) => [now - (29 - j) * 86400, arg])
											}
											return {
												data: data || [],
												chartType: plot.chartType || 'area',
												name: plot.label || (typeof arg === 'object' && arg?.name ? arg.name : `Series ${i + 1}`),
												color: plot.color
											}
										})
										return multiSeries.length > 0 ? (
											<ChartPreview multiSeries={multiSeries} />
										) : (
											<div className="text-xs text-gray-400">
												No previewable data from script. Check your script for errors.
											</div>
										)
									})()}
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	)
}
