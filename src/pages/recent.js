import { FullWrapper, PageWrapper } from 'components'
import PageHeader from 'components/PageHeader'
import Table, { columnsToShow } from 'components/Table'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { useMemo } from 'react'
import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData, basicPropertiesToKeep } from '../utils/dataApi'

export async function getStaticProps() {
  const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt'])
  const protocols = protocolsRaw.protocols.filter((p) => p.listedAt).sort((a, b) => b.listedAt - a.listedAt)
  return {
    props: {
      protocols,
    },
    revalidate: revalidate(),
  }
}

const columns = columnsToShow('protocolName', 'chains', 'listedAt', '1dChange', '7dChange', '1mChange', 'tvl')

export default function Protocols({ protocols }) {
  const data = useMemo(() => {
    const currentTimestamp = Date.now() / 1000
    const secondsInDay = 3600 * 24
    return protocols.map((p) => ({
      ...p,
      listedAt: ((currentTimestamp - p.listedAt) / secondsInDay).toFixed(2),
    }))
  }, [protocols])

  const protocolsData = useCalcStakePool2Tvl(data, 'listedAt', 'asc')

  return (
    <GeneralLayout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <PageHeader title="Recently Listed Protocols" />
          <Table data={protocolsData} columns={columns} />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
