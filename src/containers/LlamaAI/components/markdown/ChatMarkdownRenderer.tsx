import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { getEntityUrl } from '~/containers/LlamaAI/utils/entityLinks'
import { extractLlamaLinks, processCitationMarkers } from '~/containers/LlamaAI/utils/markdownHelpers'

const MARKDOWN_REMARK_PLUGINS: import('unified').PluggableList = [[remarkGfm, { singleTilde: false }]]
const MARKDOWN_REHYPE_PLUGINS = [rehypeRaw]

type EntityLinkProps = ComponentPropsWithoutRef<'a'>
type MarkdownAnchorProps = EntityLinkProps & { node?: unknown }
type MarkdownTableProps = ComponentPropsWithoutRef<'table'> & { node?: unknown }
type MarkdownCellProps = ComponentPropsWithoutRef<'th'> & { node?: unknown }
type MarkdownDataCellProps = ComponentPropsWithoutRef<'td'> & { node?: unknown }
type MarkdownListProps = ComponentPropsWithoutRef<'ul'> & { node?: unknown }
type MarkdownOrderedListProps = ComponentPropsWithoutRef<'ol'> & { node?: unknown }

function TableWrapper({
	children,
	isStreaming = false,
	tableProps
}: {
	children: ReactNode
	isStreaming: boolean
	tableProps?: ComponentPropsWithoutRef<'table'>
}) {
	const tableRef = useRef<HTMLDivElement>(null)

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
				<table
					{...tableProps}
					className={`w-full border-collapse border border-[#e6e6e6] text-sm dark:border-[#222324] ${tableProps?.className ?? ''}`}
				>
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

		return (
			<a
				href={entityUrl}
				className="text-(--link-text) hover:underline"
				target="_blank"
				rel="noreferrer noopener"
				{...props}
			>
				{type !== 'pool' ? (
					<>
						<TokenLogo name={slug} kind={type === 'chain' ? 'chain' : 'token'} alt={`Logo of ${slug}`} size={14} />{' '}
					</>
				) : null}
				{children}
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

export function ChatMarkdownRenderer({
	content,
	citations,
	isStreaming = false
}: {
	content: string
	citations?: string[]
	isStreaming?: boolean
}) {
	const processedData = useMemo(() => {
		const linkMap = extractLlamaLinks(content)
		const processedContent = processCitationMarkers(content, citations)
		return { content: processedContent, linkMap }
	}, [content, citations])

	const markdownComponents = useMemo<Components>(
		() => ({
			a: ({ node: _node, ...props }: MarkdownAnchorProps) => {
				const textChild = getSingleTextChild(props.children)
				if (!props.href && textChild && processedData.linkMap.has(textChild)) {
					const llamaUrl = processedData.linkMap.get(textChild)
					return EntityLinkRenderer({ ...props, href: llamaUrl })
				}
				return EntityLinkRenderer(props)
			},
			table: ({ children, node: _node, ...props }: MarkdownTableProps) => (
				<TableWrapper isStreaming={isStreaming} tableProps={props}>
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
		[isStreaming, processedData.linkMap]
	)

	if (!processedData.content.trim() && (!citations || citations.length === 0)) {
		return null
	}

	return (
		<ReactMarkdown
			remarkPlugins={MARKDOWN_REMARK_PLUGINS}
			rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
			components={markdownComponents}
		>
			{processedData.content}
		</ReactMarkdown>
	)
}
