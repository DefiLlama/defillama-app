import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { TokenLogo } from '~/components/TokenLogo'

interface MarkdownRendererProps {
	content: string
	citations?: string[]
}

interface EntityLinkProps {
	href?: string
	children?: any
	node?: any
	[key: string]: any
}

function getEntityUrl(type: string, slug: string): string {
	switch (type) {
		case 'protocol':
		case 'subprotocol':
			return `/protocol/${slug}`
		case 'chain':
			return `/chain/${slug}`
		default:
			return `/${type}/${slug}`
	}
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

function EntityLinkRenderer({ href, children, node, ...props }: EntityLinkProps) {
	if (href?.startsWith('llama://')) {
		const [type, slug] = href.replace('llama://', '').split('/')

		if (!['protocol', 'subprotocol', 'chain'].includes(type)) {
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
				<TokenLogo logo={iconUrl} size={14} />
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

export function MarkdownRenderer({ content, citations }: MarkdownRendererProps) {
	const processedData = useMemo(() => {
		const linkMap = new Map<string, string>()

		const llamaLinkPattern = /\[([^\]]+)\]\((llama:\/\/[^)]*)\)/g
		let match: RegExpExecArray | null
		while ((match = llamaLinkPattern.exec(content)) !== null) {
			linkMap.set(match[1], match[2])
		}

		let processedContent = content

		if (!citations || citations.length === 0) {
			processedContent = content.replace(/\[(\d+(?:,\s*\d+)*)\]/g, '')
		} else {
			processedContent = content.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, nums) => {
				const citationNums = nums.split(',').map((n: string) => parseInt(n.trim()))
				const badges = citationNums
					.map((num: number) => {
						const idx = num - 1
						if (citations[idx]) {
							return `<a href="${citations[idx]}" target="_blank" rel="noopener noreferrer" class="citation-badge">${num}</a>`
						}
						return `<span class="citation-badge">${num}</span>`
					})
					.join('')
				return badges
			})
		}

		return { content: processedContent, linkMap }
	}, [content, citations])

	const LinkRenderer = useMemo(() => {
		return (props: any) => {
			if (!props.href && props.children && processedData.linkMap.has(props.children)) {
				const llamaUrl = processedData.linkMap.get(props.children)
				return EntityLinkRenderer({ ...props, href: llamaUrl })
			}

			return EntityLinkRenderer(props)
		}
	}, [processedData.linkMap])

	return (
		<div className="prose prose-sm dark:prose-invert prose-a:no-underline flex max-w-none flex-col gap-2.5 overflow-x-auto leading-normal *:m-0">
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
			`}</style>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeRaw]}
				components={{
					a: LinkRenderer,
					table: ({ children }) => (
						<div className="overflow-x-auto">
							<table className="m-0! table-auto border-collapse border border-[#e6e6e6] text-sm dark:border-[#222324]">
								{children}
							</table>
						</div>
					),
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
					ul: ({ children }) => <ul className="m-0! grid list-disc gap-1 pl-4">{children}</ul>,
					ol: ({ children }) => <ol className="m-0! grid list-decimal gap-1 pl-4">{children}</ol>,
					li: ({ children }) => <li className="m-0!">{children}</li>
				}}
			>
				{processedData.content}
			</ReactMarkdown>
			{citations && citations.length > 0 && (
				<div className="mt-4 border-t border-[#e6e6e6] pt-3 text-sm dark:border-[#222324]">
					<h4 className="mb-2 font-semibold text-[#333] dark:text-[#d1d5db]">Sources</h4>
					{citations.map((url, i) => (
						<div key={i} className="mb-1 text-[#666] dark:text-[#919296]">
							[{i + 1}]{' '}
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								className="break-all text-blue-500 hover:underline"
							>
								{url}
							</a>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
