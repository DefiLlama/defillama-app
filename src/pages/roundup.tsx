import Link from 'next/link'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { Announcement } from '~/components/Announcement'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export default function Roundup({ messages }: { messages: Array<string | Array<string>> }) {
	return (
		<Layout title={`Daily Roundup - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				Get the roundup delivered every day for free by subscribing on{' '}
				<Link href="https://t.me/defillama_tg" passHref>
					<a target="_blank" rel="noopener noreferrer" className="underline text-[var(--blue)]">
						Telegram
					</a>
				</Link>
			</Announcement>

			<h1 className="font-semibold text-3xl text-center -mb-10">Daily news roundup with the 🦙</h1>

			<div className="flex flex-col gap-[2px] my-10 max-w-lg mx-auto text-base">
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
							<span className="underline text-[var(--link)]">{x[0]}</span>
						</a>
					)
				})}
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
	}

	const index = data.findIndex((d) => d.content.startsWith('Daily news round-up with the')) ?? null

	const raw = Number.isNaN(index) ? [] : data.slice(0, index + 1)

	const messages = raw.reverse().map((m) => m.content)

	let message = ''
	for (const m of messages) {
		// If the message starts with a topic header, e.g. News📰, then we add a newline first,
		// separating this message from the previous one. (We detect this by checking if the first
		// line ends with an emoji.)
		const [first, ...rest] = m.split('\n')
		if (first.match(/(\p{Emoji}\uFE0F|\p{Extended_Pictographic})(\*\*)?$/u)) {
			message += '\n'
		}
		message += [first, ...rest].join('\n')
	}

	const splitLlama = message.split('Daily news round-up with the 🦙')
	const final = splitLlama[1] || null
	// Emoji regex ref: https://stackoverflow.com/questions/70401560/what-is-the-difference-between-emoji-presentation-and-extended-pictographic
	const formatted =
		final
			?.replace(/(.*)\n(http.*)/g, '[$1]($2)') // merge title + link into markdown links
			?.replace(/(\d\/\d\s?)?(\w+)\s*(\p{Emoji}\uFE0F|\p{Extended_Pictographic})\n/gu, '## $2 $3\n') // {Watch📺, 1/2 Watch📺} -> ## Watch 📺
			?.replace(
				/(\d\/\d\s?)?\*\*(\d\/\d\s?)?([\w\s'".&,?!;:]+)\*\*\s*(\p{Emoji}\uFE0F|\p{Extended_Pictographic})/gu,
				'### $3 $4'
			) // {**Threads**🧵, 1/2 **Threads**🧵, **1/2 Threads**🧵} -> ### Threads 🧵
			.trim() ?? ''

	return {
		props: {
			messages: formatted
				.split('\n')
				.filter((x) => x !== '')
				.map((x) => (x.startsWith('[') ? getLink(x) : x.replaceAll('*', '').replaceAll('#', '')))
		},
		revalidate: maxAgeForNext([22])
	}
})

function getLink(text: string) {
	const matches = []
	const regex = /(\[([^\]]+)\]|\(([^\)]+)\))/g
	let match
	while ((match = regex.exec(text)) !== null) {
		matches.push(match[2] || match[3])
	}
	return matches
}
