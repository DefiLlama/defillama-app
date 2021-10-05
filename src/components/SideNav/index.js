import React from 'react'
import { withRouter } from 'react-router-dom'

import DefiSideNav from './DefiSideNav'
import NFTSideNav from './NFTSideNav'

function SideNav({ history }) {
  if (history.location.pathname.split('/')[1] === 'nfts') {
    return <NFTSideNav />
  }
  return <DefiSideNav />
}

export default withRouter(SideNav)