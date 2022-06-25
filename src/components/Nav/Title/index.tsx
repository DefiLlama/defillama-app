import * as React from 'react'
import styled from 'styled-components'
import DefiLogo from './DefiLogo'
import Link from 'next/link'

const TitleWrapper = styled.a`
  transition: transform 0.3s ease;

  :focus-visible {
    outline: 1px solid white;
  }

  @media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
    :hover {
      transform: rotate(-5deg);
    }
  }
`

interface ITitleProps {
  homePath: string
}

export default function Title({ homePath }: ITitleProps) {
  return (
    <Link href={homePath} passHref>
      <TitleWrapper>
        <span className="visually-hidden">Navigate to Home Page</span>
        <DefiLogo style={{ width: '160px', height: '54px' }} />
      </TitleWrapper>
    </Link>
  )
}
