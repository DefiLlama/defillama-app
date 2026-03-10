import { Icon } from '~/components/Icon'
import { ChatMarkdownRenderer } from './ChatMarkdownRenderer'

const SOURCE_URL_PREFIXES_TO_REPLACE = ['https://preview.dl.llama.fi', 'https://defillama2.llamao.fi'] as const

function normalizeSourceUrl(url: string) {
	for (const prefix of SOURCE_URL_PREFIXES_TO_REPLACE) {
		if (url.startsWith(prefix)) {
			return `https://defillama.com${url.slice(prefix.length)}`
		}
	}
	return url
}

export function MarkdownRenderer({
	content,
	citations,
	isStreaming = false,
	showSources = true
}: {
	content: string
	citations?: string[]
	isStreaming?: boolean
	showSources?: boolean
}) {
	if (!content.trim() && (!citations || citations.length === 0)) {
		return null
	}

	return (
		<div className="flex max-w-none flex-col gap-2.5 overflow-x-auto text-sm leading-normal">
			{content.trim() ? (
				<ChatMarkdownRenderer content={content} citations={citations} isStreaming={isStreaming} />
			) : null}
			{citations && citations.length > 0 && showSources && !isStreaming ? (
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
						{(() => {
							const occurrenceCounts = new Map<string, number>()
							return citations.map((url, index) => {
								const normalizedUrl = normalizeSourceUrl(url)
								const occurrenceIndex = occurrenceCounts.get(normalizedUrl) || 0
								occurrenceCounts.set(normalizedUrl, occurrenceIndex + 1)
								return (
									<a
										key={`citation-${normalizedUrl}-${occurrenceIndex}`}
										href={normalizedUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="group flex items-start gap-2.5 rounded-lg border border-[#e6e6e6] p-2 hover:border-(--old-blue) hover:bg-(--old-blue)/12 focus-visible:border-(--old-blue) focus-visible:bg-(--old-blue)/12 dark:border-[#222324]"
									>
										<span className="rounded bg-[rgba(0,0,0,0.04)] px-1.5 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
											{index + 1}
										</span>
										<span className="overflow-hidden text-ellipsis whitespace-nowrap">{normalizedUrl}</span>
									</a>
								)
							})
						})()}
					</div>
				</details>
			) : null}
		</div>
	)
}
