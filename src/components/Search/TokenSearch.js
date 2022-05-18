import React, { useState, useEffect, useRef } from 'react'

import { useMedia } from 'react-use'
import RightSettings from '../RightSettings'

import { CloseIcon, Container, Input, SearchIconLarge, Wrapper } from './shared'
import { standardizeProtocolName } from 'utils'
import dynamic from 'next/dynamic'

import { useYieldApp } from '../../hooks'
import { usePeggedApp } from '../../hooks'

// importing both
const OpenTokenSearch = dynamic(() => import('./OpenTokenSearch'))
const OpenYieldSearch = dynamic(() => import('./OpenYieldSearch'))
const OpenPeggedSearch = dynamic(() => import('./OpenPeggedSearch'))

const TokenSearch = ({ small = false, includeChains = true, linkPath: customPath, customOnLinkClick = () => {} }) => {
  let linkPath, OpenSearch, htmlPlaceholder
  const useYield = useYieldApp()
  const usePegged = usePeggedApp()
  if (useYield) {
    OpenSearch = OpenYieldSearch
    htmlPlaceholder = ['pool', 'token']
    linkPath = (token) => `/yields/token/${token}`
  } else if (usePegged) {
    OpenSearch = OpenPeggedSearch
    htmlPlaceholder = ['Defi', 'pegged assets']
    linkPath = (item) => `/peggedasset/${item.gecko_id}`
  } else {
    OpenSearch = OpenTokenSearch
    htmlPlaceholder = ['Defi', 'protocols']
    linkPath = (item) => {
      if (customPath) return customPath(item.name)

      if (item.isChain) {
        return '/chain/' + item.name
      }

      return `/protocol/` + standardizeProtocolName(item.name)
    }
  }

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
                ? `Search ${htmlPlaceholder[0]}...`
                : below700
                ? `Search ${htmlPlaceholder[1]}...`
                : `Search ${htmlPlaceholder[0]} ${htmlPlaceholder[1]}...`
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
      {small && !useYield && !usePegged && <RightSettings />}
    </div>
  )
}

export default TokenSearch
