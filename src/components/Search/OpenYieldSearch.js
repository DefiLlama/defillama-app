import React, { useState, useEffect, useMemo, useRef } from 'react'

import { RowFixed } from '../Row'
import { BasicLink } from '../Link'

import FormattedName from '../FormattedName'
import { TYPE } from '../../Theme'

import { useSearchData } from 'contexts/SearchData'
import { Blue, Heading, Menu, MenuItem } from './shared'
import { fetchCGMarketsData, retryCoingeckoRequest } from 'utils/dataApi'

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

const searchKeys = ['name', 'symbol']

const TokenSearch = ({
  linkPath = (token) => `/yields/token/${token.toUpperCase()}`,
  customOnLinkClick = () => {},
  wrapperRef,
  value,
  toggleMenu,
  setValue,
}) => {
  const [searcheableData, setSearcheableData] = useState(useSearchData())
  const [loading, setIsLoading] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)
  const { protocolNames } = searcheableData

  useEffect(() => {
    const fetchProtocols = async () => {
      const res = await retryCoingeckoRequest(fetchCGMarketsData, 3)
      setIsLoading(false)
      setDataFetched(true)
      setSearcheableData({
        protocolNames: res.flat(),
      })
    }
    if (!searcheableData.protocolNames.length) {
      setIsLoading(true)
      fetchProtocols()
    } else if (dataFetched === false) {
      fetchProtocols()
    }
  }, [searcheableData])

  const searchData = useMemo(() => {
    return protocolNames.map((el) => ({ name: el.name, symbol: el.symbol.toUpperCase() }))
  }, [protocolNames])

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
            <TYPE.body>Loading tokens...</TYPE.body>
          </MenuItem>
        )}
        {filteredTokenList.length === 0 && !loading && (
          <MenuItem>
            <TYPE.body>No results</TYPE.body>
          </MenuItem>
        )}
        {filteredTokenList.map((token, index) => {
          return (
            <BasicLink href={linkPath(token.symbol)} key={index} onClick={onDismiss(token)}>
              <MenuItem>
                <RowFixed>
                  <FormattedName text={token.name} maxCharacters={20} style={{ marginRight: '6px' }} />
                  <FormattedName text={`(${token.symbol})`} maxCharacters={10} />
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
