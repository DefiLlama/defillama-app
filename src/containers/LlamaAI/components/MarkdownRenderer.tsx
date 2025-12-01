import { memo, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { getEntityUrl } from '../utils/entityLinks'

interface ChartConfig {
	id: string
	type: string
	[key: string]: any
}

interface MarkdownRendererProps {
	content: string
	citations?: string[]
	isStreaming?: boolean
	charts?: ChartConfig[]
	chartData?: any[] | Record<string, any[]>
	renderChart?: (chart: ChartConfig, data: any[]) => React.ReactNode
}

interface EntityLinkProps {
	href?: string
	children?: any
	node?: any
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

function TableWrapper({ children, isStreaming = false }: { children: React.ReactNode; isStreaming: boolean }) {
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
				<table className="m-0! table-auto border-collapse border border-[#e6e6e6] text-sm dark:border-[#222324]">
					{children}
				</table>
			</div>
		</div>
	)
}

function EntityLinkRenderer({ href, children, node, ...props }: EntityLinkProps) {
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
				className="relative -bottom-0.5 inline-flex items-center gap-1 text-(--link-text) *:m-0! hover:underline"
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
	renderChart
}: MarkdownRendererProps) {
	const { contentParts, inlineChartIds } = useMemo(() => {
		const chartPlaceholderPattern = /\[CHART:([^\]]+)\]/g
		const parts: Array<{ type: 'text' | 'chart'; content: string; chartId?: string }> = []
		const foundChartIds = new Set<string>()
		let lastIndex = 0
		let match: RegExpExecArray | null

		while ((match = chartPlaceholderPattern.exec(content)) !== null) {
			if (match.index > lastIndex) {
				parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
			}
			const chartId = match[1]
			parts.push({ type: 'chart', content: '', chartId })
			foundChartIds.add(chartId)
			lastIndex = match.index + match[0].length
		}

		if (lastIndex < content.length) {
			parts.push({ type: 'text', content: content.slice(lastIndex) })
		}

		if (parts.length === 0) {
			parts.push({ type: 'text', content })
		}

		return { contentParts: parts, inlineChartIds: foundChartIds }
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

	const LinkRenderer = useMemo(() => {
		return (props: any) => {
			if (!props.href && props.children && processedData.linkMap.has(props.children)) {
				const llamaUrl = processedData.linkMap.get(props.children)
				return EntityLinkRenderer({ ...props, href: llamaUrl })
			}

			return EntityLinkRenderer(props)
		}
	}, [processedData.linkMap])

	const renderMarkdownSection = (markdownContent: string, key: string) => (
		<ReactMarkdown
			key={key}
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeRaw]}
			components={{
				a: LinkRenderer,
				table: ({ children }) => <TableWrapper isStreaming={isStreaming}>{children}</TableWrapper>,
				th: ({ children }) => (
					<th className="border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 whitespace-nowrap dark:border-[#222324]">
						{children}
					</th>
				),
				td: ({ children }) => (
					<td className="border border-[#e6e6e6] bg-white px-3 py-2 whitespace-nowrap dark:border-[#222324] dark:bg-[#181A1C]">
						{children}
					</td>
				),
				ul: ({ children }) => <ul className="grid list-disc gap-1 pl-4">{children}</ul>,
				ol: ({ children }) => <ol className="grid list-decimal gap-1 pl-4">{children}</ol>
			}}
		>
			{markdownContent}
		</ReactMarkdown>
	)

	return (
		<div className="prose prose-sm dark:prose-invert prose-a:no-underline flex max-w-none flex-col gap-2.5 overflow-x-auto leading-normal">
			<style jsx>{`
				:global(.citation-badge) {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					min-width: 18px;
					height: 18px;
					padding: 0 4px;
					margin: 0 1px;
					font-size: 11px;
					font-weight: 500;
					color: #1f67d2;
					background-color: rgba(31, 103, 210, 0.08);
					border: 1px solid rgba(31, 103, 210, 0.2);
					border-radius: 4px;
					text-decoration: none;
					transition: all 0.2s;
					cursor: pointer;
				}
				:global(.citation-badge:hover) {
					background-color: rgba(31, 103, 210, 0.15);
					border-color: rgba(31, 103, 210, 0.35);
				}
				:global(.prose *) {
					margin: 0;
				}
				:global(.prose :is(h1, h2, h3, h4, h5, h6) a) {
					bottom: 0 !important;
				}
			`}</style>
			{inlineChartIds.size > 0 ? (
				contentParts.map((part, index) => {
					if (part.type === 'chart' && part.chartId) {
						const chart = charts?.find((c) => c.id === part.chartId)
						if (chart && renderChart) {
							const data = !chartData ? [] : Array.isArray(chartData) ? chartData : (chartData[part.chartId] || [])
							return (
								<div key={`chart-${part.chartId}-${index}`} className="my-4">
									{renderChart(chart, data)}
								</div>
							)
						}
						if (isStreaming || !charts || charts.length === 0) {
							return (
								<div
									key={`chart-loading-${part.chartId}-${index}`}
									className="my-4 flex h-64 animate-pulse items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
								>
									<span className="text-gray-500">Loading chart...</span>
								</div>
							)
						}
						return null
					}
					if (part.content.trim()) {
						return renderMarkdownSection(processCitations(part.content), `text-${index}`)
					}
					return null
				})
			) : (
				renderMarkdownSection(processedData.content, 'content')
			)}
			{citations && citations.length > 0 && (
				<details className="flex flex-col text-sm">
					<summary className="m-0! mr-auto! flex items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-2 py-1 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
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
