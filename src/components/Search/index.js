import React from 'react'
import { withRouter } from 'react-router-dom'

import TokenSearch from './TokenSearch'
import NFTSearch from './NFTSearch'

function Search({ history, ...props }) {
  if (history.location.pathname.split('/')[1] === 'nfts') {
    return <NFTSearch {...props}/>
  }
  return <TokenSearch {...props} />
}

export default withRouter(Search)