import React from 'react'
import { useMedia } from 'react-use'
import TokenChart from '.'

const ProtocolChart = ({ chartData = [], ...extraParams }) => {
  const below1600 = useMedia('(max-width: 1650px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below900 = useMedia('(max-width: 900px)')
  const small = below900 || (!below1024 && below1600)

  return <TokenChart small={small} data={chartData} {...extraParams} />
}

export default ProtocolChart
