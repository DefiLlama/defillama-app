import React, { useEffect, lazy, Suspense } from 'react'
import { useMedia } from 'react-use'
import { transparentize } from 'polished'
import styled from 'styled-components'

import { AutoRow, RowBetween, RowFlat } from '../Row'
import { AutoColumn } from '../Column'
import { ButtonDark } from '../ButtonStyled'
import DropdownSelect from '../DropdownSelect'
import { PageWrapper, ContentWrapper } from '..'
import Panel from '../Panel'
import RightSettings from '../RightSettings'
import Search from '../Search'
import TopTokenList from '../NFTList'
import { TYPE, ThemedBackground } from '../../Theme'
import { formattedNum } from '../../utils'

import dynamic from 'next/dynamic'

const GlobalNFTChart = dynamic(() => import('../GlobalNFTChart'), {
  ssr: false
})

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

const basicChainOptions = ['All', 'Ethereum']
const extraChainOptions = []

const NFTDashboard = ({ history, title, totalVolumeUSD, dailyVolumeUSD, dailyChange, collections, chart }) => {
  useEffect(() => window.scrollTo(0, 0))

  const below800 = useMedia('(max-width: 800px)')
  const below1400 = useMedia('(max-width: 1400px)')

  let chainOptions = []
  if (!below1400) {
    chainOptions = [...basicChainOptions, ...extraChainOptions, 'Others']
  } else {
    chainOptions = [...basicChainOptions, 'Others']
  }

  const setSelectedChain = newSelectedChain =>
    history.push(newSelectedChain === 'All' ? '/nfts' : `/nfts/chain/${newSelectedChain}`)
  const selectedChain = 'All'
  const otherChains = chainOptions.filter(chain => chain !== selectedChain)

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <div>
          <AutoColumn gap="24px" style={{ paddingBottom: below800 ? '0' : '24px' }}>
            <RowBetween>
              <TYPE.largeHeader>{title}</TYPE.largeHeader>
              {!below800 && <RightSettings type="nfts" />}
            </RowBetween>
            <Search />
          </AutoColumn>
          {below800 && ( // mobile card
            <AutoColumn
              style={{
                height: '100%',
                width: '100%',
                marginRight: '10px',
                marginTop: '10px'
              }}
              gap="10px"
            >
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Total Volume</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                      {formattedNum(totalVolumeUSD, true)}
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>

              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Daily Volume</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                      {formattedNum(dailyVolumeUSD, true)}
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>

              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Change (24h)</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
                      {dailyChange.toFixed(2)}%
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
            </AutoColumn>
          )}
          {!below800 && (
            <AutoRow>
              <AutoColumn
                style={{
                  height: '100%',
                  width: '100%',
                  maxWidth: '350px',
                  marginRight: '10px'
                }}
                gap="10px"
              >
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Total Volume</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                        {formattedNum(totalVolumeUSD, true)}
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>

                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Daily Volume</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                        {formattedNum(dailyVolumeUSD, true)}
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>

                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Change (24h)</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
                        {dailyChange.toFixed(2)}%
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
              </AutoColumn>

              <Panel style={{ height: '100%', minHeight: '300px' }}>{<GlobalNFTChart chart={chart} />}</Panel>
            </AutoRow>
          )}

          {below800 && (
            <AutoColumn style={{ marginTop: '6px' }} gap="24px">
              <Panel style={{ height: '100%', minHeight: '300px' }}>{<GlobalNFTChart chart={chart} />}</Panel>
            </AutoColumn>
          )}

          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <TYPE.main fontSize={'1.125rem'}>NFT Rankings</TYPE.main>
              <RowFlat>
                {below800 ? (
                  <DropdownSelect
                    options={chainOptions
                      .slice(0, -1)
                      .concat(otherChains)
                      .reduce(
                        (acc, item) => ({
                          ...acc,
                          [item]: item
                        }),
                        {}
                      )}
                    active={selectedChain || 'All'}
                    setActive={setSelectedChain}
                  />
                ) : (
                  chainOptions.map((name, i) => {
                    if (name === 'Others') {
                      return (
                        <DropdownSelect
                          key={name}
                          options={otherChains.reduce(
                            (acc, item) => ({
                              ...acc,
                              [item]: item
                            }),
                            {}
                          )}
                          active={
                            chainOptions.includes(selectedChain) || selectedChain === undefined
                              ? 'Other'
                              : selectedChain
                          }
                          setActive={setSelectedChain}
                        />
                      )
                    }
                    if (selectedChain === name || (name === 'All' && selectedChain === undefined)) {
                      return (
                        <ButtonDark style={{ margin: '0.2rem' }} key={name}>
                          {name}
                        </ButtonDark>
                      )
                    } else {
                    }
                  })
                )}
              </RowFlat>
            </RowBetween>
          </ListOptions>

          {collections && (
            <Panel style={{ marginTop: '6px', padding: below800 && '1rem 0 0 0 ' }}>
              <TopTokenList tokens={collections} displayUsd={true} />
            </Panel>
          )}
        </div>

        <div style={{ margin: 'auto' }}>
          <a href="#">
            <ButtonDark>Download all data in .csv</ButtonDark>
          </a>
        </div>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default NFTDashboard
