import * as Ariakit from '@ariakit/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { createElement, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { getEntityUrl } from '~/containers/LlamaAI/utils/entityLinks'
import { extractLlamaLinks, processCitationMarkers } from '~/containers/LlamaAI/utils/markdownHelpers'
import { chainIconUrl, equityIconUrl, peggedAssetIconUrl, tokenIconUrl } from '~/utils/icons'

const MARKDOWN_REMARK_PLUGINS: import('unified').PluggableList = [[remarkGfm, { singleTilde: false }]]
const MARKDOWN_REHYPE_PLUGINS = [rehypeRaw]
const SOURCE_URL_PREFIXES_TO_REPLACE = ['https://preview.dl.llama.fi', 'https://defillama2.llamao.fi'] as const

export function headingSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
}

function extractText(children: ReactNode): string {
	if (typeof children === 'string') return children
	if (typeof children === 'number') return String(children)
	if (Array.isArray(children)) return children.map(extractText).join('')
	if (children && typeof children === 'object' && 'props' in children) {
		return extractText((children as any).props.children)
	}
	return ''
}

function HeadingWithId({
	level,
	messageId,
	children,
	...props
}: { level: number; messageId?: string; children?: ReactNode } & Record<string, any>) {
	const text = extractText(children)
	const slug = headingSlug(text)
	const id = messageId ? `${messageId}--${slug}` : slug
	return createElement(`h${level}`, { ...props, id, 'data-section-heading': true }, children)
}

/** Match `HBarChart` / `TreemapChart` graphic watermark sizing */
const TABLE_WATERMARK_HEIGHT = 40
const TABLE_WATERMARK_WIDTH = Math.round((389 / 133) * TABLE_WATERMARK_HEIGHT)

type EntityLinkProps = ComponentPropsWithoutRef<'a'>
type MarkdownAnchorProps = EntityLinkProps & { node?: unknown }
type MarkdownTableProps = ComponentPropsWithoutRef<'table'> & { node?: unknown }
type MarkdownCellProps = ComponentPropsWithoutRef<'th'> & { node?: unknown }
type MarkdownDataCellProps = ComponentPropsWithoutRef<'td'> & { node?: unknown }
type MarkdownListProps = ComponentPropsWithoutRef<'ul'> & { node?: unknown }
type MarkdownOrderedListProps = ComponentPropsWithoutRef<'ol'> & { node?: unknown }

function normalizeSourceUrl(url: string) {
	for (const prefix of SOURCE_URL_PREFIXES_TO_REPLACE) {
		if (url.startsWith(prefix)) {
			return `https://defillama.com${url.slice(prefix.length)}`
		}
	}
	return url
}

function TableWrapper({
	children,
	isStreaming = false,
	tableProps,
	onTableFullscreenOpen
}: {
	children: ReactNode
	isStreaming: boolean
	tableProps?: ComponentPropsWithoutRef<'table'>
	onTableFullscreenOpen?: () => void
}) {
	const tableRef = useRef<HTMLDivElement>(null)
	const fullscreenDialogStore = Ariakit.useDialogStore()

	const mergedTableClassName = `z-10 w-full border-collapse border border-[#e6e6e6] text-sm dark:border-[#222324] ${tableProps?.className ?? ''}`

	const openTableFullscreen = () => {
		onTableFullscreenOpen?.()
		fullscreenDialogStore.show()
	}

	const prepareCsv = () => {
		const table = tableRef.current?.querySelector('table')
		if (!table) return { filename: 'table', rows: [] }

		const rows: Array<Array<string>> = []
		const tableRows = Array.from(table.querySelectorAll('tr'))

		for (const row of tableRows) {
			const cells = Array.from(row.querySelectorAll('th, td'))
			rows.push(cells.map((cell) => cell.textContent || ''))
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
		return { filename: `table-${timestamp}`, rows }
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-[#e6e6e6] p-2 dark:border-[#222324]">
			<Ariakit.DialogProvider store={fullscreenDialogStore}>
				<Ariakit.Dialog
					modal
					portal
					unmountOnHide
					backdrop={<div className="backdrop fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />}
					className="dialog fixed inset-0 z-50 m-auto flex max-h-[80dvh] w-[calc(100vw-1rem)] max-w-7xl flex-col gap-3 overflow-hidden rounded-xl border border-[#e6e6e6] bg-(--cards-bg) shadow-2xl sm:w-[calc(100vw-2rem)] dark:border-[#222324]"
				>
					<div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e6e6e6] dark:border-[#222324]">
						{/* <Ariakit.DialogHeading className="text-sm font-medium text-(--text-form)">Table</Ariakit.DialogHeading> */}
						<Ariakit.DialogDismiss
							className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							aria-label="Close fullscreen table"
						>
							<Icon name="x" height={16} width={16} />
						</Ariakit.DialogDismiss>
					</div>
					<div className="min-h-0 flex-1 overflow-auto">
						<div className="relative overflow-x-auto">
							<div className="pointer-events-none sticky left-0 z-0 h-0 w-full max-sm:hidden" style={{ top: '50%' }}>
								<img
									src="/assets/defillama-dark-neutral.webp"
									alt=""
									height={TABLE_WATERMARK_HEIGHT}
									width={TABLE_WATERMARK_WIDTH}
									className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 dark:hidden"
								/>
								<img
									src="/assets/defillama-light-neutral.webp"
									alt=""
									height={TABLE_WATERMARK_HEIGHT}
									width={TABLE_WATERMARK_WIDTH}
									className="absolute left-1/2 hidden -translate-x-1/2 -translate-y-1/2 opacity-30 dark:block"
								/>
							</div>
							<table {...tableProps} className={mergedTableClassName}>
								{children}
							</table>
						</div>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
			<div className="ml-auto flex flex-nowrap items-center justify-end gap-2" id="ai-table-download">
				{isStreaming ? (
					<button
						type="button"
						className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) disabled:opacity-50"
						disabled
						aria-label="View table fullscreen"
					>
						<Icon name="expand" className="h-3 w-3 shrink-0" />
					</button>
				) : (
					<button
						type="button"
						onClick={openTableFullscreen}
						className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						aria-label="View table fullscreen"
					>
						<Icon name="expand" className="h-3 w-3 shrink-0" />
					</button>
				)}
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
			<div ref={tableRef} className="relative overflow-x-auto">
				<div className="pointer-events-none sticky left-0 z-0 h-0 w-full max-sm:hidden" style={{ top: '50%' }}>
					<img
						src="/assets/defillama-dark-neutral.webp"
						alt="defillama"
						height={TABLE_WATERMARK_HEIGHT}
						width={TABLE_WATERMARK_WIDTH}
						className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 dark:hidden"
					/>
					<img
						src="/assets/defillama-light-neutral.webp"
						alt="defillama"
						height={TABLE_WATERMARK_HEIGHT}
						width={TABLE_WATERMARK_WIDTH}
						className="absolute left-1/2 hidden -translate-x-1/2 -translate-y-1/2 opacity-30 dark:block"
					/>
				</div>
				<table {...tableProps} className={mergedTableClassName}>
					{children}
				</table>
			</div>
		</div>
	)
}

function EntityLinkRenderer({ href, children, ...props }: EntityLinkProps) {
	if (href?.startsWith('llama://')) {
		const [type, slug] = href.replace('llama://', '').split('/')

		if (!['protocol', 'subprotocol', 'chain', 'pool', 'category', 'stablecoin', 'cex'].includes(type)) {
			return <span>{children}</span>
		}

		const entityUrl = getEntityUrl(type, slug)

		const entityLogoUrl = (entityType: string, entitySlug: string) => {
			switch (entityType) {
				case 'chain':
					return chainIconUrl(entitySlug)
				case 'stablecoin':
					return peggedAssetIconUrl(entitySlug)
				case 'equity':
					return equityIconUrl(entitySlug)
				case 'protocol':
					return tokenIconUrl(entitySlug)
				default:
					return null
			}
		}

		const logoUrl = entityLogoUrl(type, slug)

		return (
			<a
				href={entityUrl}
				className="text-(--link-text) no-underline hover:underline"
				target="_blank"
				rel="noreferrer noopener"
				{...props}
			>
				{logoUrl ? (
					<img
						src={logoUrl}
						alt=""
						height={14}
						width={14}
						className="relative top-[-0.1em] mr-1 inline-block shrink-0 rounded-full"
					/>
				) : null}
				<span className="min-w-0">{children}</span>
			</a>
		)
	}
	return (
		<a href={href} target="_blank" rel="noreferrer noopener" {...props}>
			{children}
		</a>
	)
}

function getSingleTextChild(children: ReactNode): string | null {
	return typeof children === 'string' ? children : null
}

export function SourcesList({ citations, isStreaming = false }: { citations: string[]; isStreaming?: boolean }) {
	const sourceEntries = useMemo(() => {
		const seen = new Map<string, number>()
		const unique: Array<{ normalizedUrl: string; citationNumber: number }> = []
		for (let i = 0; i < citations.length; i++) {
			const normalizedUrl = normalizeSourceUrl(citations[i])
			if (!seen.has(normalizedUrl)) {
				seen.set(normalizedUrl, i + 1)
				unique.push({ normalizedUrl, citationNumber: i + 1 })
			}
		}
		return unique
	}, [citations])

	if (!citations.length || isStreaming) {
		return null
	}

	return (
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
				{sourceEntries.map(({ normalizedUrl, citationNumber }) => (
					<a
						key={`citation-${citationNumber}`}
						href={normalizedUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="group flex items-start gap-2.5 rounded-lg border border-[#e6e6e6] p-2 hover:border-(--old-blue) hover:bg-(--old-blue)/12 focus-visible:border-(--old-blue) focus-visible:bg-(--old-blue)/12 dark:border-[#222324]"
					>
						<span className="rounded bg-[rgba(0,0,0,0.04)] px-1.5 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
							{citationNumber}
						</span>
						<span className="overflow-hidden text-ellipsis whitespace-nowrap">{normalizedUrl}</span>
					</a>
				))}
			</div>
		</details>
	)
}

export function ChatMarkdownRenderer({
	content,
	citations,
	isStreaming = false,
	hackerMode = false,
	onTableFullscreenOpen,
	messageId
}: {
	content: string
	citations?: string[]
	isStreaming?: boolean
	hackerMode?: boolean
	onTableFullscreenOpen?: () => void
	messageId?: string
}) {
	const processedData = useMemo(() => {
		const linkMap = extractLlamaLinks(content)
		const processedContent = processCitationMarkers(content, citations)
		return { content: processedContent, linkMap }
	}, [content, citations])

	const markdownComponents = useMemo<Components>(
		() => ({
			h1: ({ node: _node, children, ...props }: any) => (
				<HeadingWithId level={1} messageId={messageId} {...props}>
					{children}
				</HeadingWithId>
			),
			h2: ({ node: _node, children, ...props }: any) => (
				<HeadingWithId level={2} messageId={messageId} {...props}>
					{children}
				</HeadingWithId>
			),
			h3: ({ node: _node, children, ...props }: any) => (
				<HeadingWithId level={3} messageId={messageId} {...props}>
					{children}
				</HeadingWithId>
			),
			a: ({ node: _node, ...props }: MarkdownAnchorProps) => {
				const textChild = getSingleTextChild(props.children)
				if (!props.href && textChild && processedData.linkMap.has(textChild)) {
					const llamaUrl = processedData.linkMap.get(textChild)
					return EntityLinkRenderer({ ...props, href: llamaUrl })
				}
				return EntityLinkRenderer(props)
			},
			table: ({ children, node: _node, ...props }: MarkdownTableProps) => (
				<TableWrapper isStreaming={isStreaming} tableProps={props} onTableFullscreenOpen={onTableFullscreenOpen}>
					{children}
				</TableWrapper>
			),
			th: ({ children, node: _node, ...props }: MarkdownCellProps) => (
				<th
					{...props}
					className={`border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 whitespace-nowrap dark:border-[#222324] ${props.className ?? ''}`}
				>
					{children}
				</th>
			),
			td: ({ children, node: _node, ...props }: MarkdownDataCellProps) => (
				<td
					{...props}
					className={`border border-[#e6e6e6] bg-white px-3 py-2 whitespace-nowrap dark:border-[#222324] dark:bg-[#181A1C] ${props.className ?? ''}`}
				>
					{children}
				</td>
			),
			ul: ({ children, node: _node, ...props }: MarkdownListProps) => (
				<ul {...props} className={`grid list-disc gap-1 pl-4 ${props.className ?? ''}`}>
					{children}
				</ul>
			),
			ol: ({ children, node: _node, ...props }: MarkdownOrderedListProps) => (
				<ol {...props} className={`grid list-decimal gap-1 pl-4 ${props.className ?? ''}`}>
					{children}
				</ol>
			)
		}),
		[isStreaming, onTableFullscreenOpen, processedData.linkMap, messageId]
	)

	if (!processedData.content.trim()) {
		return null
	}

	return (
		<div
			className={`llamaai-prose prose prose-sm flex max-w-none flex-col gap-2.5 overflow-x-auto leading-normal dark:prose-invert prose-a:no-underline${hackerMode ? ' hacker-mode' : ''}`}
		>
			<ReactMarkdown
				remarkPlugins={MARKDOWN_REMARK_PLUGINS}
				rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
				components={markdownComponents}
			>
				{processedData.content}
			</ReactMarkdown>
		</div>
	)
}
