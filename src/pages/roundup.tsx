import Link from 'next/link'
import styled from 'styled-components'
import ReactMarkdown from 'react-markdown'
import Layout from '~/layout'
import { revalidate } from '~/api'

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
	white-space: pre-line;
	line-height: 1.5rem;
	font-size: 1rem;
	margin: 0 auto;
	max-width: 500px;
	word-break: break-all;

	a {
		color: inherit;
	}

	p {
		margin: 0.5rem 0;
	}

	h2 {
		margin: 2rem 0 1rem 0;
	}

	h3 {
		margin: 1rem 0 0.5rem 0;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
`

const Banner = styled.p`
	background: #445ed0;
	text-align: center;
	margin: -36px -12px 0;
	padding: 6px;
	color: white;

	a {
		color: inherit;
		text-decoration: underline;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		margin: 0;
		position: fixed;
		top: 0;
		left: 220px;
		right: 0;
	}
`

const Content = ({ text }: { text: string }) => {
	return (
		<>
			<ReactMarkdown
				components={
					{
						// h1: 'h2',
						// // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
						// em: ({ node, ...props }) => <i style={{ color: 'red' }} {...props} />
					}
				}
			>
				{text}
			</ReactMarkdown>
		</>
	)
}

export default function Chains({ messages }) {
	console.log(messages)

	// if "Threads🧵" then turn into h2
	// if "Watch📺" then turn into h2
	// if **foobar**📺 then turn into h3
	// if http then merge with pervious line into <a/>
	const text = messages
		.replace(/(.*)\n(http.*)/g, '[$1]($2)') // merge title + link into markdown links
		.replace(/(\w+)\s*(\p{Emoji_Presentation}|\p{Extended_Pictographic})\n/gu, '## $1 $2\n')
		.replace(/\*\*(\w+)\*\*\s*(\p{Emoji_Presentation}|\p{Extended_Pictographic})\n/gu, '### $1 $2\n')

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
	// const headers = new Headers()
	// headers.append('Authorization', `Bot ${process.env.ROUND_UP_BOT_TOKEN}`)

	// let data = []

	// const response = await fetch('https://discordapp.com/api/channels/965023197365960734/messages', {
	// 	method: 'GET',
	// 	headers: headers,
	// 	redirect: 'follow'
	// })

	// if (response.ok) {
	// 	data = await response.json()
	// }

	// const index = data.findIndex((d) => d.content.startsWith('Daily news round-up with the')) ?? null

	// const raw = Number.isNaN(index) ? [] : data.slice(0, index + 1)

	// const messages = raw
	// 	.reverse()
	// 	.map((m) => m.content)
	// 	.join('')

	// const splitLlama = messages.split('Daily news round-up with the 🦙')

	const response = await fetch('https://defillama.com/api/roundupMarkdown')
	const messages = await response.json()

	const splitLlama = messages.split('Daily news round-up with the 🦙')
	console.log(splitLlama)

	return {
		props: {
			messages: splitLlama[1] || null
		},
		revalidate: revalidate()
	}
}
