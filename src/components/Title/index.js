import React from 'react'
import styled from 'styled-components'

import { Flex } from 'rebass'
import Link from '../Link'
import { RowFixed } from '../Row'
import DefiLogo from './DefiLogo'
import NFTLogo from '../../assets/nft_logo_white_long.svg'
import Image from 'next/image'

const TitleWrapper = styled.div`
  text-decoration: none;

  &:hover {
    cursor: pointer;
  }

  z-index: 10;
  @media (min-width: ${({ theme: { bpLg } }) => `calc(${bpLg} + 1px)`}) {
    padding-bottom: 1rem;
  }
`

const UniIcon = styled(Link)`
  transition: transform 0.3s ease;
  :hover {
    transform: rotate(-5deg);
  }
`

export default function Title({ homePath = '/' }) {
  return (
    <TitleWrapper>
      <Flex alignItems="center">
        <RowFixed>
          <UniIcon id="link" href={homePath}>
            {homePath === '/' ? <DefiLogo style={{ width: "160px", height: "54px" }} /> :
              <Image width="160px" height="54px" src={NFTLogo} alt="logo" priority={true} />
            }
          </UniIcon>
        </RowFixed>
      </Flex>
    </TitleWrapper>
  )
}
