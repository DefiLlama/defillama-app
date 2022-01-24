import { useGroupChainsByParent } from 'hooks/data'
import { useState, useMemo } from 'react'
import styled from 'styled-components'
import { formattedNum, formattedPercent, getPercentChange } from 'utils'

export default function GroupedTokenList({ data, groupData }) {
  const finalData = useGroupChainsByParent(data, groupData)

  return (
    <table style={{ color: 'white', background: 'black' }}>
      <thead>
        <tr>
          <TableHeader scope="col"></TableHeader>
          <TableHeader scope="col"></TableHeader>
          <TableHeader scope="col" style={{ textAlign: 'start' }}>
            Name
          </TableHeader>
          <TableHeader scope="col">Protocols</TableHeader>
          <TableHeader scope="col">1d Change</TableHeader>
          <TableHeader scope="col">7d Change</TableHeader>
          <TableHeader scope="col">1m Change</TableHeader>
          <TableHeader scope="col">TVL</TableHeader>
          <TableHeader scope="col">Mcap/TVL</TableHeader>
        </tr>
      </thead>
      <tbody>
        {Object.entries(finalData).map(([name, data], index) => (
          <ListRow name={name} data={data} index={index} key={name} />
        ))}
      </tbody>
    </table>
  )
}

const ListRow = ({ name, data, index }) => {
  const [displayChains, setDisplayChains] = useState(false)
  const handleDisplay = () => {
    setDisplayChains(!displayChains)
  }
  const childChains = data.childChains
  return (
    <>
      <tr>
        <td>{childChains ? <button onClick={handleDisplay}>-&gt;</button> : ''}</td>
        <td>{index}</td>
        <RowValues name={name} data={data} />
      </tr>
      {childChains && displayChains && (
        <>
          {childChains.map((chain) => (
            <tr key={chain.name + 'child'}>
              <td></td>
              <td></td>
              <RowValues name={chain.name} data={chain} />
            </tr>
          ))}
        </>
      )}
    </>
  )
}

const RowValues = ({ name, data }) => {
  const { change1d, change7d, change1m, tvl, mcapTvl } = useMemo(() => {
    const change1d = formattedPercent(getPercentChange(data.tvl, data.tvlPrevDay))
    const change7d = formattedPercent(getPercentChange(data.tvl, data.tvlPrevWeek))
    const change1m = formattedPercent(getPercentChange(data.tvl, data.tvlPrevMonth))
    const tvl = formattedNum(data.tvl)
    const mcapTvl = data.mcap && data.tvl && formattedNum(data.mcap / data.tvl)
    return { change1d, change7d, change1m, tvl, mcapTvl }
  }, [data])

  return (
    <>
      <TableDesc style={{ textAlign: 'start' }}>{name}</TableDesc>
      <TableDesc>{data.protocols}</TableDesc>
      <TableDesc>{change1d}</TableDesc>
      <TableDesc>{change7d}</TableDesc>
      <TableDesc>{change1m}</TableDesc>
      <TableDesc>{tvl && `$ ${tvl}`}</TableDesc>
      <TableDesc>{mcapTvl}</TableDesc>
    </>
  )
}

const TableHeader = styled.th`
  text-align: end;
`
const TableDesc = styled.td`
  text-align: end;
`
