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
				components={{
					a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
				}}
			>
				{text}
			</ReactMarkdown>
		</>
	)
}

export default function Chains({ messages }) {
	const text = messages
		.replace(/(.*)\n(http.*)/g, '[$1]($2)') // merge title + link into markdown links
		.replace(/(\w+)\s*(\p{Emoji})\n/gu, '## $1 $2\n') // Watch📺 -> ## Watch 📺
		.replace(/\*\*([\w\s'".&,?!;:]+)\*\*\s*(\p{Emoji})/gu, '### $1 $2') // **Threads**🧵 -> ### Threads 🧵

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
	const response = await fetch('https://defillama.com/api/roundupMarkdown')
	const messages = await response.json()

	const splitLlama = messages.split('Daily news round-up with the 🦙')

	return {
		props: {
			messages: splitLlama[1] || null
		},
		revalidate: revalidate()
	}
}
