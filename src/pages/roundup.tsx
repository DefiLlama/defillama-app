import { maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import Layout from '~/layout'
import { postRuntimeLogs } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export default function Roundup({ messages, date }: { messages: Array<string | Array<string>>; date: string }) {
	return (
		<Layout title={`Llama News Round-Up - DefiLlama`}>
			<Announcement notCancellable>
				Get the roundup delivered for free by subscribing on{' '}
				<a
					href="https://t.me/defillama_tg"
					target="_blank"
					rel="noopener noreferrer"
					className="text-(--blue) underline"
				>
					Telegram
				</a>
			</Announcement>

			<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<h1 className="text-center text-xl font-semibold">{`🦙 Llama News Round-Up ${date ?? ''}`}</h1>

				<div className="mx-auto flex max-w-lg flex-col gap-2 text-base">
					{messages.map((x) => {
						if (typeof x === 'string') {
							return (
								<h2 className="my-2 font-semibold" key={x}>
									{x}
								</h2>
							)
						}

						return (
							<a href={x[1]} target="_blank" rel="noreferrer noopener" key={x[1]}>
								<span>&gt; </span>
								<span className="text-(--link) underline">{x[0]}</span>
							</a>
						)
					})}
				</div>
			</div>
		</Layout>
	)
}

export const getStaticProps = withPerformanceLogging('roundup', async () => {
	const headers = new Headers()
	headers.append('Authorization', `Bot ${process.env.ROUND_UP_BOT_TOKEN}`)

	let data = []

	const response = await fetch('https://discordapp.com/api/channels/965023197365960734/messages', {
		method: 'GET',
		headers: headers,
		redirect: 'follow'
	})

	if (response.ok) {
		data = await response.json()
	} else {
		postRuntimeLogs(`Failed to fetch roundup messages: ${response.status} ${response.statusText}`)
	}

	const index = data.findIndex((d) => d.content.startsWith('🦙 Llama News Round-Up')) ?? null

	const raw = Number.isNaN(index) ? [] : data.slice(0, index + 1)

	// Combine all messages into one string
	const fullContent = raw
		.reverse()
		.map((m) => m.content)
		.join('\n')

	// Find the main roundup content - look for the start and end
	const startIndex = fullContent.indexOf('🦙 Llama News Round-Up')
	const roundupContent = startIndex !== -1 ? fullContent.substring(startIndex) : fullContent

	// Extract the date from the title
	const dateMatch = roundupContent.match(/🦙 Llama News Round-Up \| (.+?)\n/)
	const date = dateMatch ? dateMatch[1] : ''

	// Extract all numbered references first
	const numberedRefs = {}
	const refMatches = roundupContent.matchAll(/\[(\d+)\]:\s*(.+)/g)
	for (const match of refMatches) {
		numberedRefs[match[1]] = match[2]
	}

	// Split content into lines and process
	const lines = roundupContent.split('\n')
	const formattedMessages = []

	for (const line of lines) {
		const trimmedLine = line.trim()
		if (!trimmedLine) continue

		// Skip the title line
		if (trimmedLine.includes('🦙 Llama News Round-Up')) continue

		// Check if this line contains a numbered reference like [1], [2], etc.
		const numberedRefMatch = trimmedLine.match(/\[(\d+)\]:\s*(.+)/)
		if (numberedRefMatch) {
			// This is a reference line, skip it
			continue
		}

		// Check if this line contains a numbered reference in content like [1], [2], etc.
		const contentRefMatch = trimmedLine.match(/\[(\d+)\]/)
		if (contentRefMatch) {
			const number = contentRefMatch[1]
			const url = numberedRefs[number]
			if (url) {
				// Extract the title by removing the [number] reference and right arrow
				const title = trimmedLine.replace(`[${number}]`, '').replace(/^→\s*/, '').trim()
				if (title) {
					formattedMessages.push([title, url])
				}
			}
		} else if (
			trimmedLine &&
			!trimmedLine.startsWith('[') &&
			!trimmedLine.match(/^\d+\/\d+/) &&
			!trimmedLine.match(/^\[(\d+)\]:/)
		) {
			// Check if this looks like a section header (contains emoji or is a category name)
			if (
				trimmedLine.match(/\p{Emoji}/u) ||
				trimmedLine.match(/^(News|Layer 1|DeFi|Reads|Raises|Security|AI|Llama Update)/)
			) {
				formattedMessages.push(trimmedLine)
			}
		}
	}

	return {
		props: {
			messages: formattedMessages,
			date: date
		},
		revalidate: maxAgeForNext([22])
	}
})
