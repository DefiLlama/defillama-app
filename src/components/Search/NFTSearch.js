import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDebounce } from 'react-use'

import { RowFixed } from '../Row'
import TokenLogo from '../TokenLogo'
import { BasicLink } from '../Link'

import { useMedia } from 'react-use'

import FormattedName from '../FormattedName'
import { TYPE } from '../../Theme'
import RightSettings from '../RightSettings'

import { Blue, CloseIcon, Container, Heading, Input, Menu, MenuItem, SearchIconLarge, Wrapper } from './shared'

import { getNFTSearchResults } from '../../utils/dataApi'

const NFTSearch = ({ small = false }) => {
  const linkPath = collection => `/nfts/collection/${collection.slug}`

  const [showMenu, toggleMenu] = useState(false)
  const [value, setValue] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const below700 = useMedia('(max-width: 700px)')
  const below470 = useMedia('(max-width: 470px)')
  const below410 = useMedia('(max-width: 410px)')

  useEffect(() => {
    if (value !== '') {
      toggleMenu(true)
    } else {
      toggleMenu(false)
    }
  }, [value])

  const [tokensShown, setTokensShown] = useState(3)

  useDebounce(
    async () => {
      const results = await getNFTSearchResults(value)
      setSearchResults(results)
    },
    500,
    [value]
  )

  function onDismiss() {
    setTokensShown(3)
    toggleMenu(false)
    setValue('')
  }

  // refs to detect clicks outside modal
  const wrapperRef = useRef()
  const menuRef = useRef()

  const handleClick = e => {
    if (
      !(menuRef.current && menuRef.current.contains(e.target)) &&
      !(wrapperRef.current && wrapperRef.current.contains(e.target))
    ) {
      setTokensShown(3)
      toggleMenu(false)
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', e => {
      if (e.key === '/') {
        document.getElementsByClassName('searchbox')[0].focus()
      }
    })
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div
      style={
        small
          ? {
              display: 'flex',
              alignItems: 'center'
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
                ? 'Search NFTs...'
                : below700
                ? 'Search collections...'
                : 'Search NFT collections...'
            }
            value={value}
            onChange={e => {
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
        <Menu hide={!showMenu} ref={menuRef}>
          <div>
            {searchResults.length === 0 && (
              <MenuItem>
                <TYPE.body>No results</TYPE.body>
              </MenuItem>
            )}
            {searchResults.slice(0, tokensShown).map(token => {
              return (
                <BasicLink href={linkPath(token)} key={token.id} onClick={onDismiss}>
                  <MenuItem>
                    <RowFixed>
                      <TokenLogo address={token.address} logo={token.logo} style={{ marginRight: '10px' }} external />
                      <FormattedName text={token.name} maxCharacters={20} style={{ marginRight: '6px' }} />
                      (<FormattedName text={token.symbol} maxCharacters={6} />)
                    </RowFixed>
                  </MenuItem>
                </BasicLink>
              )
            })}

            <Heading>
              <Blue
                onClick={() => {
                  setTokensShown(tokensShown + 5)
                }}
              >
                See more...
              </Blue>
            </Heading>
          </div>
        </Menu>
      </Container>
      {small && <RightSettings />}
    </div>
  )
}

export default NFTSearch
