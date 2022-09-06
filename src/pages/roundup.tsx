import Link from 'next/link'
import styled from 'styled-components'
import ReactMarkdown from 'react-markdown'
import Layout from '~/layout'
import { revalidate } from '~/api'
import { Banner } from '~/components/PageBanner'

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
		color: inherit;
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
	const text =
		messages
			?.replace(/(.*)\n(http.*)/g, '[$1]($2)') // merge title + link into markdown links
			?.replace(/(\w+)\s*(\p{Emoji})\n/gu, '## $1 $2\n') // Watch📺 -> ## Watch 📺
			?.replace(/\*\*([\w\s'".&,?!;:]+)\*\*\s*(\p{Emoji})/gu, '### $1 $2') ?? // **Threads**🧵 -> ### Threads 🧵
		''

	return (
		<Layout title={`Daily Roundup - DefiLlama`} defaultSEO>
			<Banner>
				Get the roundup delivered every day for free by subscribing on{' '}
				<Link href="https://t.me/defillama_tg" passHref>
					<a target="_blank" rel="noopener noreferrer">
						Telegram
					</a>
				</Link>
			</Banner>

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

	const messages = raw
		.reverse()
		.map((m) => m.content)
		.join('')

	const splitLlama = messages.split('Daily news round-up with the 🦙')

	return {
		props: {
			messages: splitLlama[1] || null
		},
		revalidate: revalidate()
	}
}
