import Layout from '../layout'
import { transparentize } from 'polished'
import { ThemedBackground } from 'Theme'
import styled from 'styled-components'
import { revalidate } from 'utils/dataApi'
import { Panel } from 'components'

interface IBackground {
  backgroundColor?: string
}

const Background = styled(ThemedBackground)<IBackground>``

const Header = styled.h1`
  color: ${({ theme }) => theme.text1};
  font-weight: 600;
  margin: 0 0 2rem;
  text-align: center;
  font-size: revert !important;
`

const SubHeader = styled.h2`
  color: ${({ theme }) => theme.text1};
  font-weight: 600;
  margin: 0;
  font-size: 1rem;
`

const Section = styled(Panel)`
  color: ${({ theme }) => theme.text1};
  white-space: pre-line;
  width: fit-content;
  display: flex;
  flex-direction: column;
  gap: 16px;

  & > * {
    color: ${({ theme }) => theme.text1};
    font-weight: 500;
    font-size: 1rem;
    margin: 0;
  }
`

const Text = styled.p`
  color: ${({ theme }) => theme.text1};
  white-space: pre-line;
`

const Message = ({ text }) => {
  if (text.includes('Daily news round-up with the')) {
    return <Header>{text}</Header>
  }

  const textParts = text.split('\n')

  if (textParts) {
    if (textParts.length === 1) {
      return <SubHeader>{textParts[0].split('**').join(' ')}</SubHeader>
    }

    return (
      <Section>
        {textParts.map((t) =>
          t.includes('https://') ? (
            <a href={t} target="_blank" rel="noreferrer noopener">
              {t}
            </a>
          ) : t.includes('**') ? (
            <SubHeader>{t.split('**').join(' ')}</SubHeader>
          ) : (
            <Text>{t}</Text>
          )
        )}
      </Section>
    )
  }

  return <Text>{text}</Text>
}

export default function Chains({ messages }) {
  return (
    <Layout title={`Daily Roundup - DefiLlama`} defaultSEO>
      <Background backgroundColor={transparentize(0.8, '#445ed0')} />
      {messages.map((m, i) => (
        <Message key={'roundup' + i} text={m} />
      ))}
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
    .split('\n\n')

  return {
    props: {
      messages,
    },
    revalidate: revalidate(),
  }
}
