import React, { useState, useEffect, useRef } from 'react'

import { useMedia } from 'react-use'
import RightSettings from '../RightSettings'

import { CloseIcon, Container, Input, SearchIconLarge, Wrapper } from './shared'
import dynamic from 'next/dynamic'

const OpenSearch = dynamic(() => import('./OpenYieldSearch'))

const YieldSearch = ({
  small = false,
  includeChains = true,
  linkPath = (token) => `/yields/token/${token}`,
  customOnLinkClick = () => {},
}) => {
  const [showMenu, toggleMenu] = useState(false)
  const [value, setValue] = useState('')

  const below700 = useMedia('(max-width: 700px)')
  const below470 = useMedia('(max-width: 470px)')
  const below410 = useMedia('(max-width: 410px)')

  const wrapperRef = useRef()

  useEffect(() => {
    if (value !== '') {
      toggleMenu(true)
    } else {
      toggleMenu(false)
    }
  }, [value])

  return (
    <div
      style={
        small
          ? {
              display: 'flex',
              alignItems: 'center',
            }
          : {}
      }
    >
      <Container small={small}>
        <Wrapper open={showMenu} shadow={true} small={small}>
          <Input
            large={!small}
            type={'text'}
            className="searchbox"
            autocomplete="off"
            ref={wrapperRef}
            placeholder={
              small
                ? ''
                : below410
                ? 'Search...'
                : below470
                ? 'Search DeFi...'
                : below700
                ? 'Search token...'
                : 'Search pool token...'
            }
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
            }}
            onFocus={() => {
              if (!showMenu) {
                toggleMenu(true)
              }
            }}
          />
          {!showMenu ? <SearchIconLarge /> : <CloseIcon onClick={() => toggleMenu(false)} />}
        </Wrapper>
        {showMenu && (
          <OpenSearch {...{ includeChains, linkPath, customOnLinkClick, wrapperRef, value, toggleMenu, setValue }} />
        )}
      </Container>
      {small && <RightSettings />}
    </div>
  )
}

export default YieldSearch
