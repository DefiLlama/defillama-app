import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { LazyLoadImage } from 'react-lazy-load-image-component';

import { getTokenLogoPathFromAddress } from '../../utils'
import PlaceHolder from '../../assets/placeholder.png'
import EthereumLogo from '../../assets/eth.png'

const BAD_IMAGES = {}

const Inline = styled.div`
  display: flex;
  align-items: center;
  align-self: center;
`

const Image = styled(LazyLoadImage)`
  background-color: white;
  border-radius: 50%;
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
`

const StyledEthereumLogo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  > img {
    width: ${({ size }) => size};
    height: ${({ size }) => size};
  }
`

export default function TokenLogo({ logo = null, header = false, size = '24px', ...rest }) {
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [logo])

  if (error || BAD_IMAGES[logo]) {
    return (
      <Inline>
        <Image {...rest} alt={''} src={PlaceHolder} height={size} width={size} />
      </Inline>
    )
  }

  return (
    <Inline>
      <Image
        {...rest}
        alt={''}
        src={logo}
        height={size}
        width={size}
        onError={event => {
          BAD_IMAGES[logo] = true
          setError(true)
          event.preventDefault()
        }}
      />
    </Inline>
  )
}
