import Layout from '../layout'
import { transparentize } from 'polished'
import { ThemedBackground } from 'Theme'
import styled from 'styled-components'

interface IBackground {
  backgroundColor?: string
}

const Background = styled(ThemedBackground)<IBackground>``

const Header = styled.h1`
  color: ${({ theme }) => theme.text1};
  font-weight: 600;
  margin: 4px 0;
  text-align: center;
`

export default function Chains() {
  return (
    <Layout title={`Daily Roundup - DefiLlama`} defaultSEO>
      <Background backgroundColor={transparentize(0.8, '#445ed0')} />
      <Header>Daily news round-up with the 🦙 </Header>
    </Layout>
  )
}

export async function getServerSideProps({ req, res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59')

  return {
    props: {},
  }
}
