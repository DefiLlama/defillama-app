import React, { useEffect, useState } from 'react'
import { useMedia } from 'react-use'
import 'feather-icons'
import { transparentize } from 'polished'

import TopTokenList from '../components/NFTList'
import { TYPE, ThemedBackground } from '../Theme'
import Panel from '../components/Panel'
import { PageWrapper, ContentWrapper } from '../components'
import { AutoRow, RowBetween } from '../components/Row'
import { AutoColumn } from '../components/Column'
import RightSettings from '../components/RightSettings'
import { ButtonDark } from '../components/ButtonStyled'

import { useDisplayUsdManager } from '../contexts/LocalStorage'
import { formattedNum } from '../utils'

function AllNFTsPage(props) {
  const [nfts, setNfts] = useState([])
  const [displayUsd, _] = useDisplayUsdManager()

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch('https://api.llama.fi/nft/collections')
      .then(r => r.json())
      .then(data => setNfts(data.collections.map(collection => ({
          ...collection,
          floor: displayUsd ? collection.floorUsd : collection.floor,
          dailyVolume: displayUsd ? collection.dailyVolumeUsd : collection.dailyVolume,
          totalVolume: displayUsd ? collection.totalVolumeUsd : collection.totalVolume,
        })
      )))
  }, [displayUsd])

  const below800 = useMedia('(max-width: 800px)')
  let title = `NFT Rankings`
  document.title = `${title} - Defi Llama`;

  const totalVolumeUsd = nfts.reduce((prevSum, collection) => prevSum + collection.totalVolumeUSD, 0)
  const totalMarketCap = nfts.reduce((prevSum, collection) => prevSum + collection.marketCap, 0)

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <div>
          <RowBetween>
            <TYPE.largeHeader>{title}</TYPE.largeHeader>
            {!below800 && <RightSettings type='nfts' />}
          </RowBetween>

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
                    <TYPE.heading>Total Volume (USD)</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                      {formattedNum(totalVolumeUsd, true)}
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Total Market Cap (USD)</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                      {formattedNum(totalMarketCap, true)}
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
                      <TYPE.heading>Total Volume (USD)</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                        {formattedNum(totalVolumeUsd, true)}
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Total Market Cap (USD)</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                        {formattedNum(totalMarketCap, true)}
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
              </AutoColumn>
            </AutoRow>
          )}

          {nfts !== undefined && (
            <Panel style={{ marginTop: '6px', padding: below800 && '1rem 0 0 0 ' }}>
              <TopTokenList tokens={nfts} itemMax={below800 ? 50 : 100} displayUsd={displayUsd} />
            </Panel>
          )}
        </div>
        <div style={{ margin: 'auto' }}>
          <a href="#"><ButtonDark>Download all data in .csv</ButtonDark></a>
        </div>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default AllNFTsPage