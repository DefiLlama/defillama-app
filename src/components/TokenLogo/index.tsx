import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import NextImage from 'next/image'
import PlaceHolder from '../../assets/placeholder.png'

interface TokenLogoProps {
  logo?: string | null
  header?: boolean
  external?: boolean
  size?: number
  style?: React.CSSProperties
  address?: string
}

const BAD_IMAGES = {}

const Inline = styled.span`
  display: flex;
  align-items: center;
  background: transparent;
  border-radius: 50%;
  box-shadow: ${({ theme }) => theme.shadowSm};
`

const Image = styled(NextImage)`
  background: transparent;
  border-radius: 50%;
`
// next/image won't work, idk why
export default function TokenLogo({
  logo = null,
  external = false /* TODO: temporary fix */,
  size = 24,
  style,
  ...rest
}: TokenLogoProps) {
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [logo])

  if (external) {
    return (
      <Inline>
        <Image
          {...rest}
          alt={''}
          src={`/api/image?url=${encodeURIComponent(logo)}`}
          height={size}
          width={size}
          layout="fixed"
        />
      </Inline>
    )
  }

  if (error || BAD_IMAGES[logo]) {
    return (
      <Inline>
        <Image {...rest} alt={''} src={PlaceHolder} height={size} width={size} layout="fixed" />
      </Inline>
    )
  }

  return (
    <Inline style={style}>
      <Image
        {...rest}
        alt={''}
        src={logo}
        height={size}
        width={size}
        layout="fixed"
        onError={(event) => {
          BAD_IMAGES[logo] = true
          setError(true)
          event.preventDefault()
        }}
      />
    </Inline>
  )
}
