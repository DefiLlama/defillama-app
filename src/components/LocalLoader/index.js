import React from 'react'
import Image from 'next/image'
import styled, { css, keyframes } from 'styled-components'
import { useNFTApp } from '../../hooks'
import DefiLogo from 'assets/logo_white.webp'
import NFTLogo from 'assets/nft_logo_white.webp'
const rotate = keyframes`
  0% { transform: scale(1); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
`

const Loader = styled.div`
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  animation: ${rotate} 800ms linear infinite;
  & > * {
    width: 72px;
  }
  ${props =>
    props.fill && !props.height
      ? css`
          height: 100vh;
        `
      : css`
          height: 180px;
        `}
`

const LocalLoader = ({ fill, ...props }) => {
  const isNFTApp = useNFTApp()

  return (
    <Loader fill={fill} {...props}>
      <Image src={isNFTApp ? NFTLogo : DefiLogo} alt="loading-icon" />
    </Loader>
  )
}

export default LocalLoader
