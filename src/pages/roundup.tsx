import Link from 'next/link'
import styled from 'styled-components'
import ReactMarkdown from 'react-markdown'
import Layout from '~/layout'
import { revalidate } from '~/api'
import Announcement from '~/components/Announcement'

const Header = styled.h1`
	color: ${({ theme }) => theme.text1};
	font-weight: 600;
	margin: 24px 0 -24px 0;
	font-size: revert !important;
	text-align: center;

	a {
		position: relative;
		top: 4px;
	}
`

const Text = styled.div`
	color: ${({ theme }) => theme.text1};
	font-size: 1rem;
	margin: 2rem auto;
	max-width: 500px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;

	a {
		color: ${({ theme }) => theme.link};
		text-decoration: underline;
	}

	p {
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0.3rem 0;
	}

	h2 {
		margin: 2rem 0 1rem 0;
	}

	h3 {
		margin: 1rem 0 0.6rem 0;
	}
`

const Content = ({ text }: { text: string }) => {
	return (
		<>
			<ReactMarkdown
				components={{
					a: ({ node, ...props }) => (
						<span>
							&gt; <a target="_blank" rel="noopener noreferrer" {...props} />
						</span>
					)
				}}
			>
				{text}
			</ReactMarkdown>
		</>
	)
}

export default function Chains({ messages }: { messages?: string }) {
	// Emoji regex ref: https://stackoverflow.com/questions/70401560/what-is-the-difference-between-emoji-presentation-and-extended-pictographic
	const text =
		messages
			?.replace(/(.*)\n(http.*)/g, '[$1]($2)') // merge title + link into markdown links
			?.replace(/(\d\/\d\s?)?(\w+)\s*(\p{Emoji}\uFE0F|\p{Extended_Pictographic})\n/gu, '## $2 $3\n') // {Watch📺, 1/2 Watch📺} -> ## Watch 📺
			?.replace(
				/(\d\/\d\s?)?\*\*(\d\/\d\s?)?([\w\s'".&,?!;:]+)\*\*\s*(\p{Emoji}\uFE0F|\p{Extended_Pictographic})/gu,
				'### $3 $4'
			) // {**Threads**🧵, 1/2 **Threads**🧵, **1/2 Threads**🧵} -> ### Threads 🧵
			.trim() ?? ''

	return (
		<Layout title={`Daily Roundup - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				Get the roundup delivered every day for free by subscribing on{' '}
				<Link href="https://t.me/defillama_tg" passHref>
					<a target="_blank" rel="noopener noreferrer">
						Telegram
					</a>
				</Link>
			</Announcement>

			<Header>Daily news roundup with the 🦙</Header>

			<Text>
				<Content text={text} />
			</Text>
		</Layout>
	)
}

export async function getStaticProps() {
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

	return {
		props: {
			messages: splitLlama[1] || null
		},
		revalidate: revalidate()
	}
}
