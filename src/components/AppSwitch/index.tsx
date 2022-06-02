import { useYieldApp } from 'hooks'
import styled from 'styled-components'
import Link from 'next/link'
import { BarChart2, Percent } from 'react-feather'

export default function AppSwitch() {
  const isYieldApp = useYieldApp()

  return (
    <Wrapper>
      <Link href="/" passHref>
        <AppLink active={!isYieldApp}>
          <BarChart2 size={14} />
          <span>DeFi</span>
        </AppLink>
      </Link>
      <Link href="/yields" passHref>
        <AppLink active={isYieldApp}>
          <Percent size={14} />
          <span>Yields</span>
        </AppLink>
      </Link>
    </Wrapper>
  )
}

const Wrapper = styled.span`
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 6px;
  background: #000;
  padding: 6px;
  height: 40px;
  width: 160px;

  @media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
    display: flex;
  }
`

interface IAppLink {
  active: boolean
}

const AppLink = styled.a<IAppLink>`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.white};
  font-size: 14px;
  white-space: nowrap;
  flex-wrap: nowrap;
  padding: 6px;
  border-radius: 6px;
  background: ${({ active }) => (active ? '#445ed0' : '#000')};
  flex: 1;

  :focus-visible {
    outline: 1px solid white;
  }
`
