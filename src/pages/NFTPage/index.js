import React from 'react'
import { transparentize } from 'polished'
import { useMedia } from 'react-use'

import Header from './Header'
import Section from './Section'

import { AutoRow, RowBetween, RowFixed } from '../../components/Row'
import Chart from '../../components/Chart'
import { DetailsLayout, DashboardWrapper, PanelWrapper } from '../shared'
import FormattedName from '../../components/FormattedName'
import { Hover, PageWrapper, ContentWrapper, StyledIcon } from '../../components'
import Panel from '../../components/Panel'
import { TYPE, ThemedBackground } from '../../Theme'

export default function NFTPage({ collection }) {
  const backgroundColor = '#2172E5'
  const below1600 = useMedia('(max-width: 1600px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below800 = useMedia('(max-width: 800px)')
  const below600 = useMedia('(max-width: 600px)')
  const below500 = useMedia('(max-width: 500px)')
  const below850 = useMedia('(max-width: 850px)')

  const address = '0x'
  const logo = 'placeholder'
  const name = 'placeholder'
  const description = 'placeholder'

  return(
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />
      <ContentWrapper>
        <DashboardWrapper style={{ marginTop: below1024 ? '0' : '1rem' }}>
          <Header address={address} below1024={below1024} logo={logo} name={name} />
          <PanelWrapper>
            <Section title="Description" content={description} />
            <Section title="Market Cap" content={description} />
            <Section title="Links" content={description} />

            <Panel style={{ gridColumn: below1024 ? '1' : '2/4', gridRow: below1024 ? '' : '1/4' }}>
              <Chart />
            </Panel>
          </PanelWrapper>
        </DashboardWrapper>
      </ContentWrapper>
    </PageWrapper>
  )
}