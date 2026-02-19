import { useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import type { AlertIntent, ChartConfiguration, ChartItem, CsvItem } from '../types'
import { getEntityIcon, getEntityUrl } from '../utils/entityLinks'
import { extractLlamaLinks, parseArtifactPlaceholders, processCitationMarkers } from '../utils/markdownHelpers'
import { AlertArtifact, AlertArtifactLoading } from './AlertArtifact'
import { ChartRenderer } from './ChartRenderer'
import { CSVExportArtifact, CSVExportLoading, type CSVExport } from './CSVExportArtifact'

const MARKDOWN_REMARK_PLUGINS = [remarkGfm]
const MARKDOWN_REHYPE_PLUGINS = [rehypeRaw]
const SOURCE_URL_PREFIXES_TO_REPLACE = ['https://preview.dl.llama.fi', 'https://defillama2.llamao.fi'] as const

function normalizeSourceUrl(url: string): string {
	for (const prefix of SOURCE_URL_PREFIXES_TO_REPLACE) {
		if (url.startsWith(prefix)) {
			return `https://defillama.com${url.slice(prefix.length)}`
		}
	}
	return url
}

interface InlineChartConfig {
	resizeTrigger?: number
	saveableChartIds?: string[]
	savedChartIds?: string[]
	messageId?: string
	alertIntent?: AlertIntent
	savedAlertIds?: string[]
}

interface MarkdownRendererProps {
	content: string
	citations?: string[]
	isStreaming?: boolean
	/** @deprecated Use artifactIndex instead for O(1) lookup */
	charts?: ChartConfiguration[]
	/** @deprecated Use artifactIndex instead for O(1) lookup */
	chartData?: any[] | Record<string, any[]>
	inlineChartConfig?: InlineChartConfig
	/** @deprecated Use artifactIndex instead for O(1) lookup */
	csvExports?: CSVExport[]
	/** New: Map of artifact IDs to ChartItem | CsvItem for O(1) lookup */
	artifactIndex?: Map<string, ChartItem | CsvItem>
}

interface EntityLinkProps {
	href?: string
	children?: any
	[key: string]: any
}

function TableWrapper({ children, isStreaming = false }: { children: React.ReactNode; isStreaming: boolean }) {
	const tableRef = useRef<HTMLDivElement>(null)

	const prepareCsv = () => {
		const table = tableRef.current?.querySelector('table')
		if (!table) return { filename: 'table.csv', rows: [] }

		const rows: Array<Array<string>> = []
		const tableRows = Array.from(table.querySelectorAll('tr'))

		for (const row of tableRows) {
			const cells = Array.from(row.querySelectorAll('th, td'))
			rows.push(cells.map((cell) => cell.textContent || ''))
		}

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
}

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

export function MarkdownRenderer({
	content,
	citations,
	isStreaming = false,
	charts,
	chartData,
	inlineChartConfig,
	csvExports,
	artifactIndex
}: MarkdownRendererProps) {
	const { contentParts, inlineChartIds, inlineCsvIds, inlineAlertIds } = useMemo(() => {
		const parsed = parseArtifactPlaceholders(content)
		return {
			contentParts: parsed.parts,
			inlineChartIds: parsed.chartIds,
			inlineCsvIds: parsed.csvIds,
			inlineAlertIds: parsed.alertIds
		}
	}, [content])

	const processedData = useMemo(() => {
		const linkMap = extractLlamaLinks(content)
		const processedContent = processCitationMarkers(content, citations)
		return { content: processedContent, linkMap }
	}, [content, citations])

	const markdownComponents = useMemo(
		() => ({
			a: (props: any) => {
				if (!props.href && props.children && processedData.linkMap.has(props.children)) {
					const llamaUrl = processedData.linkMap.get(props.children)
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
		[isStreaming, processedData.linkMap]
	)

	const renderMarkdownSection = (markdownContent: string, key: string) => (
		<ReactMarkdown
			key={key}
			remarkPlugins={MARKDOWN_REMARK_PLUGINS}
			rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
			components={markdownComponents}
		>
			{markdownContent}
		</ReactMarkdown>
	)

	return (
		<div className="llamaai-prose prose prose-sm flex max-w-none flex-col gap-2.5 overflow-x-auto leading-normal dark:prose-invert prose-a:no-underline">
			{inlineChartIds.size > 0 || inlineCsvIds.size > 0 || inlineAlertIds.size > 0
				? contentParts.map((part, partIndex) => {
						if (part.type === 'chart' && part.chartId) {
							// New: O(1) lookup via artifactIndex
							const artifactItem = artifactIndex?.get(part.chartId)
							if (artifactItem?.type === 'chart') {
								const chartItem = artifactItem as ChartItem
								// Normalize chartData to array format for ChartRenderer
								const normalizedData = Array.isArray(chartItem.chartData)
									? chartItem.chartData
									: chartItem.chartData?.[chartItem.chart.id] || []
								return (
									<div key={`chart-${part.chartId}`} className="my-4">
										<ChartRenderer
											charts={[chartItem.chart]}
											chartData={normalizedData}
											isLoading={false}
											isAnalyzing={false}
											resizeTrigger={inlineChartConfig?.resizeTrigger}
											messageId={inlineChartConfig?.messageId}
										/>
									</div>
								)
							}

							// Legacy: O(n) lookup via charts array (backward compatibility)
							const chart = charts?.find((c) => c.id === part.chartId)
							if (chart && inlineChartConfig) {
								const data = !chartData ? [] : Array.isArray(chartData) ? chartData : chartData[part.chartId] || []
								return (
									<div key={`chart-${part.chartId}`} className="my-4">
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
							if (isStreaming || (!artifactIndex && (!charts || charts.length === 0))) {
								return (
									<div
										key={`chart-loading-${part.chartId}`}
										className="my-4 flex h-64 animate-pulse items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
									>
										<p className="text-sm text-gray-500">Loading chart...</p>
									</div>
								)
							}
							return null
						}
						if (part.type === 'csv' && part.csvId) {
							// New: O(1) lookup via artifactIndex
							const artifactItem = artifactIndex?.get(part.csvId)
							if (artifactItem?.type === 'csv') {
								const csvItem = artifactItem as CsvItem
								return (
									<CSVExportArtifact
										key={`csv-${part.csvId}`}
										csvExport={{
											id: csvItem.id,
											title: csvItem.title,
											url: csvItem.url,
											rowCount: csvItem.rowCount,
											filename: csvItem.filename
										}}
									/>
								)
							}

							// Legacy: O(n) lookup via csvExports array (backward compatibility)
							const csvExport = csvExports?.find((e) => e.id === part.csvId)
							if (csvExport) {
								return <CSVExportArtifact key={`csv-${part.csvId}`} csvExport={csvExport} />
							}
							if (isStreaming || (!artifactIndex && !csvExports)) {
								return <CSVExportLoading key={`csv-loading-${part.csvId}`} />
							}
							return null
						}
						if (part.type === 'alert' && part.alertId) {
							if (inlineChartConfig?.alertIntent) {
								return (
									<AlertArtifact
										key={`alert-${part.alertId}`}
										alertId={part.alertId}
										alertIntent={inlineChartConfig.alertIntent}
										messageId={inlineChartConfig.messageId}
										savedAlertIds={inlineChartConfig.savedAlertIds}
									/>
								)
							}
							if (isStreaming) {
								return <AlertArtifactLoading key={`alert-loading-${part.alertId}`} />
							}
							return null
						}
						if (part.content.trim()) {
							return renderMarkdownSection(
								processCitationMarkers(part.content, citations),
								`text-${partIndex}-${part.content.slice(0, 50)}`
							)
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
						{citations.map((url, index) => {
							const normalizedUrl = normalizeSourceUrl(url)
							return (
								<a
									key={`citation-${index}-${normalizedUrl}`}
									href={normalizedUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={`group flex items-start gap-2.5 rounded-lg border border-[#e6e6e6] p-2 hover:border-(--old-blue) hover:bg-(--old-blue)/12 focus-visible:border-(--old-blue) focus-visible:bg-(--old-blue)/12 dark:border-[#222324]`}
								>
									<span className="rounded bg-[rgba(0,0,0,0.04)] px-1.5 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
										{index + 1}
									</span>
									<span className="overflow-hidden text-ellipsis whitespace-nowrap">{normalizedUrl}</span>
								</a>
							)
						})}
					</div>
				</details>
			)}
		</div>
	)
}
