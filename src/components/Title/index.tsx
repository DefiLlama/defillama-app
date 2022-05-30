import React from 'react'
import styled from 'styled-components'
import DefiLogo from './DefiLogo'
import Link from 'next/link'

const TitleWrapper = styled.a`
  text-decoration: none;
  transition: transform 0.3s ease;
  :hover {
    cursor: pointer;
    transform: rotate(-5deg);
  }

  & > svg {
    display: block;
  }

  :focus-visible {
    outline: 1px solid white;
  }
`

export default function Title() {
  return (
    <Link href="/" passHref>
      <TitleWrapper>
        <DefiLogo style={{ width: '160px', height: '54px' }} />
      </TitleWrapper>
    </Link>
  )
}
