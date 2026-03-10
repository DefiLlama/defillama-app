import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { useMemo } from 'react'
import { Streamdown, defaultUrlTransform } from 'streamdown'
import { TokenLogo } from '~/components/TokenLogo'
import { getEntityUrl } from '../../utils/entityLinks'
import {
	convertLlamaLinksToPlaceholders,
	decodeLlamaLinkPlaceholder,
	processCitationMarkers,
	sanitizeUrl
} from '../../utils/markdownHelpers'
import styles from '../llamaai.module.css'

type Components = ComponentPropsWithoutRef<typeof Streamdown>['components']

type EntityLinkProps = ComponentPropsWithoutRef<'a'>
type MarkdownAnchorProps = EntityLinkProps & { node?: unknown }

function CitationBadge({ children, href, citations }: { children: ReactNode; href?: string; citations?: string[] }) {
	const text = getSingleTextChild(children) ?? String(children)
	const match = href?.match(/^#citation(?:-missing)?-(\d+)$/)
	const citationNumber = match ? Number(match[1]) : Number.NaN

	if (Number.isNaN(citationNumber)) {
		return <>{children}</>
	}

	const safeUrl = citations?.[citationNumber - 1] ? sanitizeUrl(citations[citationNumber - 1]) : null

	if (!safeUrl) {
		return <span className={styles.citationBadge}>{text}</span>
	}

	return (
		<a href={safeUrl} target="_blank" rel="noopener noreferrer" className={styles.citationBadge}>
			{text}
		</a>
	)
}

function EntityLinkRenderer({ href, children, ...props }: EntityLinkProps) {
	if (href?.startsWith('llama://')) {
		const { className: _className, ...anchorProps } = props
		const [type, slug] = href.replace('llama://', '').split('/')

		if (!['protocol', 'subprotocol', 'chain', 'pool', 'category', 'stablecoin', 'cex'].includes(type)) {
			return <span>{children}</span>
		}

		const entityUrl = getEntityUrl(type, slug)

		return (
			<a
				href={entityUrl}
				className={`${styles.entityLink} relative -bottom-0.5 inline-flex items-center gap-1 text-(--link-text) hover:underline`}
				target="_blank"
				rel="noreferrer noopener"
				{...anchorProps}
			>
				{type !== 'pool' ? (
					<TokenLogo name={slug} kind={type === 'chain' ? 'chain' : 'token'} alt={`Logo of ${slug}`} size={14} />
				) : null}
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
	const processedContent = useMemo(
		() => convertLlamaLinksToPlaceholders(processCitationMarkers(content, citations)),
		[content, citations]
	)

	const markdownComponents = useMemo<Components>(
		() => ({
			a: ({ node: _node, ...props }: MarkdownAnchorProps) => {
				if (props.href?.startsWith('#citation-')) {
					return (
						<CitationBadge href={props.href} citations={citations}>
							{props.children}
						</CitationBadge>
					)
				}

				const llamaUrlFromPlaceholder = decodeLlamaLinkPlaceholder(props.href)
				if (llamaUrlFromPlaceholder) {
					return EntityLinkRenderer({ ...props, href: llamaUrlFromPlaceholder })
				}
				return EntityLinkRenderer(props)
			}
		}),
		[citations]
	)

	if (!processedContent.trim() && (!citations || citations.length === 0)) {
		return null
	}

	return (
		<Streamdown
			mode={isStreaming ? 'streaming' : 'static'}
			parseIncompleteMarkdown
			isAnimating={isStreaming}
			caret={isStreaming ? 'block' : undefined}
			remend={{ linkMode: 'text-only' }}
			linkSafety={{ enabled: false }}
			className={styles.streamdownRoot}
			controls={{ table: true, code: false, mermaid: false }}
			components={markdownComponents}
			urlTransform={(url, key, node) => defaultUrlTransform(url, key, node) ?? null}
		>
			{processedContent}
		</Streamdown>
	)
}
