
import React, { useState, useEffect, useMemo, useRef } from 'react'

import { RowFixed } from '../Row'
import TokenLogo from '../TokenLogo'
import { BasicLink } from '../Link'

import { useMedia } from 'react-use'

import FormattedName from '../FormattedName'
import { TYPE } from '../../Theme'
import RightSettings from '../RightSettings'

import { Blue, CloseIcon, Container, Heading, Input, Menu, MenuItem, SearchIconLarge, Wrapper } from './shared'
import { useAllTokenData } from '../../contexts/TokenData'

export default ({ small = false, linkPath = (token) => '/protocol/' + token.name?.toLowerCase().split(' ').join('-'), customOnLinkClick = () => { } }) => {
  const searchKeys = ['symbol', 'name']

  const allTokenData = useAllTokenData()

  const [showMenu, toggleMenu] = useState(false)
  const [value, setValue] = useState('')

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

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
  }

  const [tokensShown, setTokensShown] = useState(3)

  const filteredTokenList = useMemo(() => {
    if (!showMenu) {
      return []
    }
    if (value === '') {
      return Object.values(allTokenData).slice(0, tokensShown)
    }
    return allTokenData
      ? Object.values(allTokenData)
        .filter(token => {
          const regexMatches = searchKeys.map(tokenEntryKey => {
            return token[tokenEntryKey]?.match(new RegExp(escapeRegExp(value), 'i'))
          })
          return regexMatches.some(m => m)
        }).slice(0, tokensShown)
      : []
  }, [allTokenData, value, tokensShown, showMenu, searchKeys])

  const onDismiss = token => () => {
    setTokensShown(3)
    toggleMenu(false)
    setValue('')
    customOnLinkClick(token)
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
    <div style={small ? {
      display: 'flex',
      alignItems: 'center'
    } : {}}>
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
                      ? 'Search protocols...'
                      : 'Search DeFi protocols...'
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
            {filteredTokenList.length === 0 && (
              <MenuItem>
                <TYPE.body>No results</TYPE.body>
              </MenuItem>
            )}
            {filteredTokenList.map(token => {
              return (
                <BasicLink
                  to={linkPath(token)}
                  key={token.id}
                  onClick={onDismiss(token)}
                >
                  <MenuItem>
                    <RowFixed>
                      <TokenLogo address={token.address} logo={token.logo} style={{ marginRight: '10px' }} />
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