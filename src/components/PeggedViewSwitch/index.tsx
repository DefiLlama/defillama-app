import { usePeggedChainOverview } from 'hooks'
import styled from 'styled-components'
import Link from 'next/link'
import { Link as LinkIcon, DollarSign } from 'react-feather'

export default function PeggedViewSwitch() {
  const isPeggedChainOverview = usePeggedChainOverview()

  return (
    <Wrapper>
      <Link href="/peggedassets/stablecoins" passHref>
        <AppLink active={!isPeggedChainOverview}>
          <DollarSign size={14} />
          <span>Assets</span>
        </AppLink>
      </Link>
      <Link href="/peggedassets/stablecoins/chains" passHref>
        <AppLink active={isPeggedChainOverview}>
          <LinkIcon size={14} />
          <span>Chains</span>
        </AppLink>
      </Link>
    </Wrapper>
  )
}

const Wrapper = styled.span`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 6px;
  background: ${({ theme }) => theme.bg6};
  padding: 6px;
  height: 40px;
  width: 200px;
  margin: 0 auto;
`

interface IAppLink {
  active: boolean
}

const AppLink = styled.a<IAppLink>`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  color: ${({ active, theme }) => (active ? '#fff' : theme.text1)};
  font-size: 14px;
  white-space: nowrap;
  flex-wrap: nowrap;
  padding: 6px;
  border-radius: 6px;
  background: ${({ active, theme }) => (active ? '#445ed0' : theme.bg6)};
  flex: 1;
`
