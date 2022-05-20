import { GeneralLayout } from '../layout'
import { PageWrapper, FullWrapper } from 'components'
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
    <GeneralLayout title={`Daily Roundup - DefiLlama`} defaultSEO>
      <PageWrapper>
        <Background backgroundColor={transparentize(0.8, '#445ed0')} />
        <FullWrapper>
          <Header>Daily news round-up with the 🦙 </Header>
          <script
            async
            src="https://telegram.org/js/telegram-widget.js?19"
            data-telegram-post="defillama_tg/268"
            data-width="100%"
          ></script>
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}

export async function getServerSideProps({ req, res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59')

  return {
    props: {},
  }
}
