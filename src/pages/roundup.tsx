import Layout from '../layout'
import styled from 'styled-components'
import { revalidate } from 'utils/dataApi'

const Header = styled.h1`
  color: ${({ theme }) => theme.text1};
  font-weight: 600;
  margin: 0;
  text-align: center;
  font-size: revert !important;
`

const Text = styled.p`
  color: ${({ theme }) => theme.text1};
  white-space: pre-line;
  line-height: 1.5rem;
  font-size: 1rem;
  margin: 0 auto;
  word-break: break-all;
`

export default function Chains({ messages }) {
  return (
    <Layout title={`Daily Roundup - DefiLlama`} defaultSEO>
      <Header>Daily news round-up with the 🦙</Header>
      <Text>{messages}</Text>
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
    redirect: 'follow',
  })

  if (response.ok) {
    data = await response.json()
  }

  const index = data?.findIndex((d) => d.content.startsWith('Daily news round-up with the')) ?? null

  const raw = Number.isNaN(index) ? [] : data.slice(0, index + 1)

  const messages = raw
    .reverse()
    .map((m) => m.content)
    .join('')

  const splitLlama = messages.split('🦙')

  return {
    props: {
      messages: splitLlama[1],
    },
    revalidate: revalidate(),
  }
}
