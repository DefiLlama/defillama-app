import React, { useState, useEffect, useMemo, useRef } from 'react'

import { RowFixed } from '../Row'
import TokenLogo from '../TokenLogo'
import { BasicLink } from '../Link'

import FormattedName from '../FormattedName'
import { TYPE } from '../../Theme'

import { useSearchData } from 'contexts/SearchData'
import { Blue, Heading, Menu, MenuItem } from './shared'
import { chainIconUrl, tokenIconUrl, standardizeProtocolName } from 'utils'
import { PROTOCOLS_API } from 'constants'

const defaultLinkPath = (item) => {
  if (item.isChain) {
    return '/chain/' + item.name
  }
  return `/protocol/` + standardizeProtocolName(item.name)
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

const searchKeys = ['symbol', 'name']

const TokenSearch = ({
  includeChains = true,
  linkPath = defaultLinkPath,
  customOnLinkClick = () => {},
  wrapperRef,
  value,
  toggleMenu,
  setValue,
}) => {
  const [searcheableData, setSearcheableData] = useState(useSearchData())
  const [loading, setIsLoading] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)
  const { protocolNames, chainsSet } = searcheableData

  useEffect(() => {
    const fetchProtocols = ()=> fetch(PROTOCOLS_API)
      .then((res) => res.json())
      .then((res) => {
        setIsLoading(false)
        setDataFetched(true)
        setSearcheableData({
          protocolNames: res.protocols,
          chainsSet: res.chains,
        })
      })
    if (!searcheableData.protocolNames.length) {
      setIsLoading(true)
      fetchProtocols()
    } else if(dataFetched === false){
      fetchProtocols()
    }
  }, [searcheableData])

  const searchData = useMemo(() => {
    const chainData = includeChains
      ? chainsSet.map((name) => ({
          logo: chainIconUrl(name),
          isChain: true,
          name,
        }))
      : []
    return [...chainData, ...protocolNames.map((token) => ({ ...token, logo: tokenIconUrl(token.name) }))]
  }, [protocolNames, chainsSet, includeChains])

  const [tokensShown, setTokensShown] = useState(3)

  const filteredTokenList = useMemo(() => {
    if (value === '') {
      return searchData.slice(0, tokensShown)
    }
    return searchData
      ? searchData
          .filter((token) => {
            const regexMatches = searchKeys.map((tokenEntryKey) => {
              return token[tokenEntryKey]?.match(new RegExp(escapeRegExp(value), 'i'))
            })
            return regexMatches.some((m) => m)
          })
          .slice(0, tokensShown)
      : []
  }, [searchData, value, tokensShown])

  const onDismiss = (token) => () => {
    setTokensShown(3)
    toggleMenu(false)
    setValue('')
    customOnLinkClick(token)
  }

  // refs to detect clicks outside modal
  const menuRef = useRef()

  const handleClick = (e) => {
    if (
      !(menuRef.current && menuRef.current.contains(e.target)) &&
      !(wrapperRef.current && wrapperRef.current.contains(e.target))
    ) {
      setTokensShown(3)
      toggleMenu(false)
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', (e) => {
      if (e.key === '/') {
        document.getElementsByClassName('searchbox')[0].focus()
      }
    })
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  })

  return (
    <Menu ref={menuRef}>
      <div>
        {loading && (
          <MenuItem>
            <TYPE.body>Loading protocols...</TYPE.body>
          </MenuItem>
        )}
        {filteredTokenList.length === 0 && !loading && (
          <MenuItem>
            <TYPE.body>No results</TYPE.body>
          </MenuItem>
        )}
        {filteredTokenList.map((token, index) => {
          return (
            <BasicLink href={linkPath(token)} key={index} onClick={onDismiss(token)}>
              <MenuItem>
                <RowFixed>
                  <TokenLogo address={token.address} logo={token.logo} style={{ marginRight: '10px' }} />
                  <FormattedName text={token.name} maxCharacters={20} style={{ marginRight: '6px' }} />
                  <FormattedName text={token.symbol && `(${token.symbol})`} maxCharacters={6} />
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
  )
}

export default TokenSearch
