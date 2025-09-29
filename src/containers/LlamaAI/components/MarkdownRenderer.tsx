import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
				className="relative -bottom-0.5 inline-flex items-center gap-1 text-(--link-text) hover:underline"
				target="_blank"
				rel="noreferrer noopener"
				{...props}
			>
				<img
					src={iconUrl}
					alt={`${children} icon`}
					height={14}
					width={14}
					className="m-0! flex-shrink-0 rounded-full object-cover"
				/>
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
		<div className="prose prose-sm dark:prose-invert prose-ul:grid prose-ul:gap-1 prose-ol:grid prose-ol:gap-1 prose-li:m-0 prose-a:no-underline prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-[#e6e6e6] dark:prose-th:border-[#222324] prose-th:px-3 prose-th:py-2 prose-th:whitespace-nowrap prose-td:whitespace-nowrap prose-th:bg-(--app-bg) prose-td:border prose-td:border-[#e6e6e6] dark:prose-td:border-[#222324] prose-td:bg-white dark:prose-td:bg-[#181A1C] prose-td:px-3 prose-td:py-2 flex max-w-none flex-col gap-2.5 overflow-x-auto leading-normal *:m-0">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					a: LinkRenderer
				}}
			>
				{processedData.content}
			</ReactMarkdown>
		</div>
	)
}
