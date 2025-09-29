import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TokenLogo } from '~/components/TokenLogo'

interface MarkdownRendererProps {
	content: string
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

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
	const processedData = useMemo(() => {
		const linkMap = new Map<string, string>()

		const llamaLinkPattern = /\[([^\]]+)\]\((llama:\/\/[^)]*)\)/g
		let match: RegExpExecArray | null
		while ((match = llamaLinkPattern.exec(content)) !== null) {
			linkMap.set(match[1], match[2])
		}

		return { content, linkMap }
	}, [content])

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
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
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
		</div>
	)
}
