import * as Ariakit from '@ariakit/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { createElement, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { EntityPreviewLink } from '~/containers/Articles/renderer/EntityPreviewLink'
import type { ArticleEntityType } from '~/containers/Articles/types'
import { CitationPill } from '~/containers/LlamaAI/components/messages/CitationPill'
import type { FactCheckReference } from '~/containers/LlamaAI/types'
import { getEntityUrl } from '~/containers/LlamaAI/utils/entityLinks'
import {
	allowLlamaAIExternalHostname,
	getLlamaAIExternalAllowlistSnapshot,
	isLlamaAIExternalLink,
	parseLlamaAIExternalAllowlistSnapshot
} from '~/containers/LlamaAI/utils/externalLinks'
import {
	escapeBareOrderedListMarkers,
	extractLlamaLinks,
	processCitationMarkers,
	processFactCheckCitations
} from '~/containers/LlamaAI/utils/markdownHelpers'
import { ExternalLinkInterstitial } from '~/containers/ProDashboard/components/ExternalLinkInterstitial'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { equityIconUrl } from '~/utils/icons'
import { SANITIZE_REHYPE_PLUGINS } from './sanitizeConfig'

const MARKDOWN_REMARK_PLUGINS: import('unified').PluggableList = [[remarkGfm, { singleTilde: false }]]
const SOURCE_URL_PREFIXES_TO_REPLACE = ['https://preview.dl.llama.fi', 'https://defillama2.llamao.fi'] as const

export function headingSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
}

function createHeadingIdFactory(messageId?: string) {
	const counts = new Map<string, number>()

	return (text: string) => {
		const slug = headingSlug(text) || 'section'
		const baseId = messageId ? `${messageId.slice(0, 8)}-${slug}` : slug
		const occurrence = counts.get(baseId) ?? 0
		counts.set(baseId, occurrence + 1)
		return occurrence === 0 ? baseId : `${baseId}-${occurrence}`
	}
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
	resolveId,
	children,
	...props
}: {
	level: number
	messageId?: string
	resolveId: (text: string) => string
	children?: ReactNode
} & Record<string, any>) {
	const text = extractText(children)
	const id = resolveId(text)
	const attrs: Record<string, any> = { ...props, id, 'data-section-heading': true }
	if (level === 2 && messageId) {
		attrs['data-section-msg'] = messageId
	}
	return createElement(`h${level}`, attrs, children)
}

/** Match `HBarChart` / `TreemapChart` graphic watermark sizing */
const TABLE_WATERMARK_HEIGHT = 40
const TABLE_WATERMARK_WIDTH = Math.round((389 / 133) * TABLE_WATERMARK_HEIGHT)

type EntityLinkProps = ComponentPropsWithoutRef<'a'> & {
	onExternalLinkClick?: (href: string) => void
	allowedExternalHosts?: ReadonlySet<string>
}
type MarkdownAnchorProps = EntityLinkProps & { node?: unknown }
type MarkdownTableProps = ComponentPropsWithoutRef<'table'> & { node?: unknown }
type MarkdownCellProps = ComponentPropsWithoutRef<'th'> & { node?: unknown }
type MarkdownDataCellProps = ComponentPropsWithoutRef<'td'> & { node?: unknown }
type MarkdownListProps = ComponentPropsWithoutRef<'ul'> & { node?: unknown }
type MarkdownOrderedListProps = ComponentPropsWithoutRef<'ol'> & { node?: unknown }
type CitationBadgeProps = { children?: ReactNode; href?: string; node?: unknown }

const LLAMA_PREVIEW_ENTITY_TYPES: Partial<Record<string, ArticleEntityType>> = {
	protocol: 'protocol',
	subprotocol: 'protocol',
	chain: 'chain',
	category: 'category',
	stablecoin: 'stablecoin',
	cex: 'cex'
}

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
	onTableFullscreenOpen,
	messageId
}: {
	children: ReactNode
	isStreaming: boolean
	tableProps?: ComponentPropsWithoutRef<'table'>
	onTableFullscreenOpen?: () => void
	messageId?: string
}) {
	const tableRef = useRef<HTMLDivElement>(null)
	const fullscreenDialogStore = Ariakit.useDialogStore()

	const mergedTableClassName = `z-10 w-full border-collapse border border-[#e6e6e6] text-sm dark:border-[#222324] ${tableProps?.className ?? ''}`
	const inlineTableClassName = `llamaai-table-inline ${mergedTableClassName}`
	const fullscreenTableClassName = `llamaai-table-fullscreen ${mergedTableClassName}`

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
		const filename = `table-${timestamp}`
		const headerRow = rows[0] ?? []
		trackUmamiEvent('llamaai-download', {
			kind: 'table-csv',
			filename,
			rowCount: Math.max(0, rows.length - 1),
			columns: headerRow.join('|').slice(0, 480),
			messageId: messageId ?? ''
		})
		return { filename, rows }
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
					<div className="min-h-0 flex-1 overflow-auto overscroll-contain">
						<div className="relative">
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
							<table {...tableProps} className={fullscreenTableClassName}>
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
				<table {...tableProps} className={inlineTableClassName}>
					{children}
				</table>
			</div>
		</div>
	)
}

function EntityLinkRenderer({
	href,
	children,
	onClick,
	onExternalLinkClick,
	allowedExternalHosts,
	...props
}: EntityLinkProps) {
	if (href?.startsWith('llama://')) {
		const [type, slug] = href.replace('llama://', '').split('/')

		if (!['protocol', 'subprotocol', 'chain', 'pool', 'category', 'stablecoin', 'cex', 'equity'].includes(type)) {
			return <span>{children}</span>
		}

		const entityUrl = getEntityUrl(type, slug)
		const articleEntityType = LLAMA_PREVIEW_ENTITY_TYPES[type]

		if (articleEntityType) {
			return (
				<EntityPreviewLink
					entity={{
						entityType: articleEntityType,
						slug,
						label: extractText(children) || slug,
						route: entityUrl
					}}
				>
					{children}
				</EntityPreviewLink>
			)
		}

		const logoUrl = type === 'equity' ? equityIconUrl(slug) : null
		return (
			<a
				href={entityUrl}
				className="text-(--link-text) no-underline hover:underline"
				target="_blank"
				rel="noreferrer noopener"
				onClick={onClick}
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
	const external = isLlamaAIExternalLink(href, allowedExternalHosts)
	return (
		<a
			href={href}
			target="_blank"
			rel={external ? 'noopener noreferrer nofollow ugc' : 'noreferrer noopener'}
			className="text-(--link-text) no-underline hover:underline"
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				if (external) {
					event.preventDefault()
					onExternalLinkClick?.(href)
				}
			}}
			{...props}
		>
			{children}
		</a>
	)
}

function getSingleTextChild(children: ReactNode): string | null {
	return typeof children === 'string' ? children : null
}

function getCodeLanguage(children: ReactNode): string | null {
	if (!children || typeof children !== 'object' || !('props' in children)) return null
	const className = (children as any).props?.className
	if (typeof className !== 'string') return null
	const match = className.match(/language-(\S+)/)
	return match ? match[1] : null
}

type MarkdownPreProps = ComponentPropsWithoutRef<'pre'> & { node?: unknown }

function CodeBlock({ children, node: _node, className, ...props }: MarkdownPreProps) {
	const [copied, setCopied] = useState(false)
	const language = getCodeLanguage(children)

	const handleCopy = async () => {
		const text = extractText(children)
		if (!text) return
		try {
			await navigator.clipboard.writeText(text)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {
			// silent
		}
	}

	return (
		<div className="group relative">
			{language ? (
				<span className="pointer-events-none absolute top-2 left-3 z-10 font-mono text-[11px] tracking-wide text-white/50 select-none">
					{language}
				</span>
			) : null}
			<button
				type="button"
				onClick={handleCopy}
				aria-label={copied ? 'Copied' : 'Copy code'}
				data-copied={copied || undefined}
				className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-md text-white/60 opacity-0 transition-[opacity,background-color,color] group-hover:opacity-100 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:opacity-100 focus-visible:outline-none data-copied:opacity-100"
			>
				<Icon name={copied ? 'check' : 'copy'} height={14} width={14} />
			</button>
			<pre {...props} className={`${language ? '!pt-8' : ''} ${className ?? ''}`}>
				{children}
			</pre>
		</div>
	)
}

function CitationBadge({ children, href }: { children?: ReactNode; href?: string }) {
	const className =
		'mx-px inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-[rgba(31,103,210,0.2)] bg-[rgba(31,103,210,0.08)] px-1 text-[11px] leading-none font-medium text-[#1f67d2] no-underline hover:border-[rgba(31,103,210,0.35)] hover:bg-[rgba(31,103,210,0.15)]'

	if (!href) {
		return <span className={className}>{children}</span>
	}

	return (
		<a href={href} target="_blank" rel="noopener noreferrer" className={className}>
			{children}
		</a>
	)
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
	factCheckReferences,
	isStreaming = false,
	hackerMode = false,
	onTableFullscreenOpen,
	messageId
}: {
	content: string
	citations?: string[]
	factCheckReferences?: FactCheckReference[]
	isStreaming?: boolean
	hackerMode?: boolean
	onTableFullscreenOpen?: () => void
	messageId?: string
}) {
	const [pendingExternalHref, setPendingExternalHref] = useState<string | null>(null)
	const externalAllowlistSnapshot = useSyncExternalStore(
		subscribeToLocalStorage,
		getLlamaAIExternalAllowlistSnapshot,
		() => '[]'
	)
	const allowedExternalHosts = useMemo(
		() => parseLlamaAIExternalAllowlistSnapshot(externalAllowlistSnapshot),
		[externalAllowlistSnapshot]
	)
	const processedData = useMemo(() => {
		const linkMap = extractLlamaLinks(content)
		const factCheckProcessed =
			factCheckReferences && factCheckReferences.length > 0
				? processFactCheckCitations(content, factCheckReferences)
				: content
		const processedContent = escapeBareOrderedListMarkers(processCitationMarkers(factCheckProcessed, citations))
		return { content: processedContent, linkMap }
	}, [content, citations, factCheckReferences])

	const resolveHeadingId = createHeadingIdFactory(messageId)
	const markdownComponents: Components = {
		h1: ({ node: _node, children, ...props }: any) => (
			<HeadingWithId level={1} messageId={messageId} resolveId={resolveHeadingId} {...props}>
				{children}
			</HeadingWithId>
		),
		h2: ({ node: _node, children, ...props }: any) => (
			<HeadingWithId level={2} messageId={messageId} resolveId={resolveHeadingId} {...props}>
				{children}
			</HeadingWithId>
		),
		h3: ({ node: _node, children, ...props }: any) => (
			<HeadingWithId level={3} messageId={messageId} resolveId={resolveHeadingId} {...props}>
				{children}
			</HeadingWithId>
		),
		a: ({ node: _node, ...props }: MarkdownAnchorProps) => {
			const textChild = getSingleTextChild(props.children)
			if (!props.href && textChild && processedData.linkMap.has(textChild)) {
				const llamaUrl = processedData.linkMap.get(textChild)
				return EntityLinkRenderer({
					...props,
					href: llamaUrl,
					onExternalLinkClick: setPendingExternalHref,
					allowedExternalHosts
				})
			}
			return EntityLinkRenderer({ ...props, onExternalLinkClick: setPendingExternalHref, allowedExternalHosts })
		},
		table: ({ children, node: _node, ...props }: MarkdownTableProps) => (
			<TableWrapper
				isStreaming={isStreaming}
				tableProps={props}
				onTableFullscreenOpen={onTableFullscreenOpen}
				messageId={messageId}
			>
				{children}
			</TableWrapper>
		),
		th: ({ children, node: _node, ...props }: MarkdownCellProps) => (
			<th
				{...props}
				className={`border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 align-top whitespace-nowrap dark:border-[#222324] [.llamaai-table-fullscreen_&]:[overflow-wrap:anywhere] [.llamaai-table-fullscreen_&]:break-words [.llamaai-table-fullscreen_&]:whitespace-normal ${props.className ?? ''}`}
			>
				{children}
			</th>
		),
		td: ({ children, node: _node, ...props }: MarkdownDataCellProps) => (
			<td
				{...props}
				className={`border border-[#e6e6e6] bg-white px-3 py-2 align-top whitespace-nowrap dark:border-[#222324] dark:bg-[#181A1C] [.llamaai-table-fullscreen_&]:[overflow-wrap:anywhere] [.llamaai-table-fullscreen_&]:break-words [.llamaai-table-fullscreen_&]:whitespace-normal ${props.className ?? ''}`}
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
			<ol {...props} className={`grid list-decimal gap-1 pl-8 ${props.className ?? ''}`}>
				{children}
			</ol>
		),
		pre: ({ children, ...props }: MarkdownPreProps) => <CodeBlock {...props}>{children}</CodeBlock>
	}

	;(markdownComponents as Record<string, any>)['citation-badge'] = ({
		node: _node,
		children,
		...props
	}: CitationBadgeProps) => (
		<CitationBadge href={typeof props.href === 'string' ? props.href : undefined}>{children}</CitationBadge>
	)

	;(markdownComponents as Record<string, any>)['fact-check-pill'] = (props: Record<string, any>) => {
		if (!factCheckReferences) return null
		const raw = props['data-ref'] ?? props.dataRef
		const numericId = Number(raw)
		const ref = factCheckReferences.find((r) => r.id === numericId)
		if (!ref) return <span>[{raw}]</span>
		return <CitationPill reference={ref} />
	}

	if (!processedData.content.trim()) {
		return null
	}

	return (
		<div
			className={`llamaai-prose prose prose-sm flex max-w-none flex-col gap-2.5 overflow-x-auto leading-normal dark:prose-invert prose-a:no-underline${hackerMode ? ' hacker-mode' : ''}`}
		>
			<ReactMarkdown
				remarkPlugins={MARKDOWN_REMARK_PLUGINS}
				rehypePlugins={SANITIZE_REHYPE_PLUGINS}
				components={markdownComponents}
			>
				{processedData.content}
			</ReactMarkdown>
			<ExternalLinkInterstitial
				href={pendingExternalHref}
				onClose={() => setPendingExternalHref(null)}
				onAllowPermanently={(hostname, href) => {
					allowLlamaAIExternalHostname(hostname)
					setPendingExternalHref(null)
					window.open(href, '_blank', 'noopener,noreferrer')
				}}
			/>
		</div>
	)
}
