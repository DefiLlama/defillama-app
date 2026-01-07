import { memo, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import type { ChartConfiguration } from '../types'
import { getEntityUrl } from '../utils/entityLinks'
import { ChartRenderer } from './ChartRenderer'
import { CSVExportArtifact, CSVExportLoading, type CSVExport } from './CSVExportArtifact'

interface InlineChartConfig {
	resizeTrigger?: number
	saveableChartIds?: string[]
	savedChartIds?: string[]
	messageId?: string
}

interface MarkdownRendererProps {
	content: string
	citations?: string[]
	isStreaming?: boolean
	charts?: ChartConfiguration[]
	chartData?: any[] | Record<string, any[]>
	inlineChartConfig?: InlineChartConfig
	csvExports?: CSVExport[]
}

interface EntityLinkProps {
	href?: string
	children?: any
	[key: string]: any
}

function getEntityIcon(type: string, slug: string): string {
	switch (type) {
		case 'protocol':
		case 'subprotocol':
			return `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`
		case 'chain':
			return `https://icons.llamao.fi/icons/chains/rsz_${slug}?w=48&h=48`
		default:
			return ''
	}
}

const TableWrapper = memo(function TableWrapper({
	children,
	isStreaming = false
}: {
	children: React.ReactNode
	isStreaming: boolean
}) {
	const tableRef = useRef<HTMLDivElement>(null)

	const prepareCsv = () => {
		const table = tableRef.current?.querySelector('table')
		if (!table) return { filename: 'table.csv', rows: [] }

		const rows: Array<Array<string>> = []
		const tableRows = Array.from(table.querySelectorAll('tr'))

		tableRows.forEach((row) => {
			const cells = Array.from(row.querySelectorAll('th, td'))
			rows.push(cells.map((cell) => cell.textContent || ''))
		})

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
		return { filename: `table-${timestamp}.csv`, rows }
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-[#e6e6e6] p-2 dark:border-[#222324]">
			<div className="ml-auto flex flex-nowrap items-center justify-end" id="ai-table-download">
				{isStreaming ? (
					<button
						className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						disabled
					>
						<Icon name="download-paper" className="h-3 w-3 shrink-0" />
						<span>.csv</span>
					</button>
				) : (
					<CSVDownloadButton prepareCsv={prepareCsv} smol />
				)}
			</div>
			<div ref={tableRef} className="overflow-x-auto">
				<table className="table-auto border-collapse border border-[#e6e6e6] text-sm dark:border-[#222324]">
					{children}
				</table>
			</div>
		</div>
	)
})

function EntityLinkRenderer({ href, children, ...props }: EntityLinkProps) {
	if (href?.startsWith('llama://')) {
		const [type, slug] = href.replace('llama://', '').split('/')

		if (!['protocol', 'subprotocol', 'chain', 'pool'].includes(type)) {
			return <span>{children}</span>
		}

		const entityUrl = getEntityUrl(type, slug)
		const iconUrl = getEntityIcon(type, slug)

		return (
			<a
				href={entityUrl}
				className="relative -bottom-0.5 inline-flex items-center gap-1 text-(--link-text) hover:underline"
				target="_blank"
				rel="noreferrer noopener"
				{...props}
			>
				{type !== 'pool' && <TokenLogo logo={iconUrl} size={14} />}
				<span className="truncate">{children}</span>
			</a>
		)
	}
	return (
		<a href={href} target="_blank" rel="noreferrer noopener" {...props}>
			{children}
		</a>
	)
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
	content,
	citations,
	isStreaming = false,
	charts,
	chartData,
	inlineChartConfig,
	csvExports
}: MarkdownRendererProps) {
	const { contentParts, inlineChartIds, inlineCsvIds } = useMemo(() => {
		const chartPlaceholderPattern = /\[CHART:([^\]]+)\]/g
		const csvPlaceholderPattern = /\[CSV:([^\]]+)\]/g
		const parts: Array<{ type: 'text' | 'chart' | 'csv'; content: string; chartId?: string; csvId?: string }> = []
		const foundChartIds = new Set<string>()
		const foundCsvIds = new Set<string>()

		const allMatches: Array<{ index: number; length: number; type: 'chart' | 'csv'; id: string }> = []

		let match: RegExpExecArray | null
		while ((match = chartPlaceholderPattern.exec(content)) !== null) {
			allMatches.push({ index: match.index, length: match[0].length, type: 'chart', id: match[1] })
			foundChartIds.add(match[1])
		}
		while ((match = csvPlaceholderPattern.exec(content)) !== null) {
			allMatches.push({ index: match.index, length: match[0].length, type: 'csv', id: match[1] })
			foundCsvIds.add(match[1])
		}

		allMatches.sort((a, b) => a.index - b.index)

		let lastIndex = 0
		for (const m of allMatches) {
			if (m.index > lastIndex) {
				parts.push({ type: 'text', content: content.slice(lastIndex, m.index) })
			}
			if (m.type === 'chart') {
				parts.push({ type: 'chart', content: '', chartId: m.id })
			} else {
				parts.push({ type: 'csv', content: '', csvId: m.id })
			}
			lastIndex = m.index + m.length
		}

		if (lastIndex < content.length) {
			parts.push({ type: 'text', content: content.slice(lastIndex) })
		}

		if (parts.length === 0) {
			parts.push({ type: 'text', content })
		}

		return { contentParts: parts, inlineChartIds: foundChartIds, inlineCsvIds: foundCsvIds }
	}, [content])

	const processCitations = useMemo(() => {
		return (text: string): string => {
			if (!citations || citations.length === 0) {
				return text.replace(/\[(\d+(?:(?:-\d+)|(?:,\s*\d+))*)\]/g, '')
			}
			return text.replace(/\[(\d+(?:(?:-\d+)|(?:,\s*\d+))*)\]/g, (_, nums) => {
				const parts = nums.split(',').map((p: string) => p.trim())
				const expandedNums: number[] = []
				parts.forEach((part: string) => {
					if (part.includes('-')) {
						const [start, end] = part.split('-').map((n: string) => parseInt(n.trim()))
						if (!isNaN(start) && !isNaN(end) && start <= end) {
							for (let i = start; i <= end; i++) expandedNums.push(i)
						}
					} else {
						const num = parseInt(part.trim())
						if (!isNaN(num)) expandedNums.push(num)
					}
				})
				return expandedNums
					.map((num) => {
						const idx = num - 1
						return citations[idx]
							? `<a href="${citations[idx]}" target="_blank" rel="noopener noreferrer" class="citation-badge">${num}</a>`
							: `<span class="citation-badge">${num}</span>`
					})
					.join('')
			})
		}
	}, [citations])

	const processedData = useMemo(() => {
		const linkMap = new Map<string, string>()
		const llamaLinkPattern = /\[([^\]]+)\]\((llama:\/\/[^)]*)\)/g
		let match: RegExpExecArray | null
		while ((match = llamaLinkPattern.exec(content)) !== null) {
			linkMap.set(match[1], match[2])
		}
		return { content: processCitations(content), linkMap }
	}, [content, processCitations])

	const linkMapRef = useRef(processedData.linkMap)
	linkMapRef.current = processedData.linkMap

	const markdownComponents = useMemo(
		() => ({
			a: (props: any) => {
				if (!props.href && props.children && linkMapRef.current.has(props.children)) {
					const llamaUrl = linkMapRef.current.get(props.children)
					return EntityLinkRenderer({ ...props, href: llamaUrl })
				}
				return EntityLinkRenderer(props)
			},
			table: ({ children }: { children: React.ReactNode }) => (
				<TableWrapper isStreaming={isStreaming}>{children}</TableWrapper>
			),
			th: ({ children }: { children: React.ReactNode }) => (
				<th className="border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 whitespace-nowrap dark:border-[#222324]">
					{children}
				</th>
			),
			td: ({ children }: { children: React.ReactNode }) => (
				<td className="border border-[#e6e6e6] bg-white px-3 py-2 whitespace-nowrap dark:border-[#222324] dark:bg-[#181A1C]">
					{children}
				</td>
			),
			ul: ({ children }: { children: React.ReactNode }) => <ul className="grid list-disc gap-1 pl-4">{children}</ul>,
			ol: ({ children }: { children: React.ReactNode }) => <ol className="grid list-decimal gap-1 pl-4">{children}</ol>
		}),
		[isStreaming]
	)

	const renderMarkdownSection = (markdownContent: string, key: string) => (
		<ReactMarkdown key={key} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
			{markdownContent}
		</ReactMarkdown>
	)

	return (
		<div className="prose llamaai-prose prose-sm dark:prose-invert prose-a:no-underline flex max-w-none flex-col gap-2.5 overflow-x-auto leading-normal">
			{inlineChartIds.size > 0 || inlineCsvIds.size > 0
				? contentParts.map((part, index) => {
						if (part.type === 'chart' && part.chartId) {
							const chart = charts?.find((c) => c.id === part.chartId)
							if (chart && inlineChartConfig) {
								const data = !chartData ? [] : Array.isArray(chartData) ? chartData : chartData[part.chartId] || []
								return (
									<div key={`chart-${part.chartId}-${index}`} className="my-4">
										<ChartRenderer
											charts={[chart]}
											chartData={data}
											isLoading={false}
											isAnalyzing={false}
											resizeTrigger={inlineChartConfig.resizeTrigger}
											messageId={inlineChartConfig.messageId}
										/>
									</div>
								)
							}
							if (isStreaming || !charts || charts.length === 0) {
								return (
									<div
										key={`chart-loading-${part.chartId}-${index}`}
										className="my-4 flex h-64 animate-pulse items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
									>
										<p className="text-sm text-gray-500">Loading chart...</p>
									</div>
								)
							}
							return null
						}
						if (part.type === 'csv' && part.csvId) {
							const csvExport = csvExports?.find((e) => e.id === part.csvId)
							if (csvExport) {
								return <CSVExportArtifact key={`csv-${part.csvId}-${index}`} csvExport={csvExport} />
							}
							if (isStreaming || !csvExports) {
								return <CSVExportLoading key={`csv-loading-${part.csvId}-${index}`} />
							}
							return null
						}
						if (part.content.trim()) {
							return renderMarkdownSection(processCitations(part.content), `text-${index}`)
						}
						return null
					})
				: renderMarkdownSection(processedData.content, 'content')}
			{citations && citations.length > 0 && (
				<details className="flex flex-col text-sm">
					<summary className="mr-auto flex items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-2 py-1 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M9 17H7A5 5 0 0 1 7 7h2" />
							<path d="M15 7h2a5 5 0 1 1 0 10h-2" />
							<line x1="8" x2="16" y1="12" y2="12" />
						</svg>
						<span>Sources</span>
						<Icon name="chevron-down" height={14} width={14} />
					</summary>
					<div className="flex flex-col gap-2.5 pt-2.5">
						{citations.map((url, index) => (
							<a
								key={`citation-${url}`}
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								className={`group flex items-start gap-2.5 rounded-lg border border-[#e6e6e6] p-2 hover:border-(--old-blue) hover:bg-(--old-blue)/12 focus-visible:border-(--old-blue) focus-visible:bg-(--old-blue)/12 dark:border-[#222324]`}
							>
								<span className="rounded bg-[rgba(0,0,0,0.04)] px-1.5 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
									{index + 1}
								</span>
								<span className="overflow-hidden text-ellipsis whitespace-nowrap">{url}</span>
							</a>
						))}
					</div>
				</details>
			)}
		</div>
	)
})
