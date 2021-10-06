import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { useNFTApp } from '../../hooks'

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

const LocalLoader = ({ fill }) => {
  const isNFTApp = useNFTApp()
  const imgSrc = require(isNFTApp ? '../../assets/nft_logo_white.png' : '../../assets/logo_white.png')

  return (
    <Loader fill={fill}>
      <img src={imgSrc} alt="loading-icon" />
    </Loader>
  )
}

export default LocalLoader
