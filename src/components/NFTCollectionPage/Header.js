import React from 'react'

import FormattedName from '../../components/FormattedName'
import { RowBetween, RowFixed } from '../../components/Row'
import TokenLogo from '../../components/TokenLogo'
import { TYPE } from '../../Theme'

const Header = ({ address, name, logo, below1024 }) => (
  <RowBetween style={{ flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'flex-start' }}>
    <RowFixed style={{ flexWrap: 'wrap' }}>
      <RowFixed style={{ alignItems: 'baseline' }}>
        <TokenLogo address={address} logo={logo} size={32} style={{ alignSelf: 'center' }} external />
        <TYPE.main fontSize={below1024 ? '1.5rem' : '2rem'} fontWeight={500} style={{ margin: '0 1rem' }}>
          <RowFixed gap="6px">
            <FormattedName text={name ? name + ' ' : ''} maxCharacters={16} style={{ marginRight: '6px' }} />{' '}
          </RowFixed>
        </TYPE.main>{' '}
      </RowFixed>
    </RowFixed>
  </RowBetween>
)

export default Header
