import { IDexResponse } from "~/api/types";
import type { IStackedBarChartProps } from "~/components/TokenChart/StackedBarChart";
import { capitalizeFirstLetter } from "..";

const summAllVolumes = (breakdownVolumes: IDexResponse['volumeHistory'][0]['dailyVolume']) =>
  Object.values(breakdownVolumes).reduce((acc, volume) =>
    acc + Object.values(volume)
      .reduce<number>((vacc, current) => typeof current === 'number' ? vacc + current : vacc, 0)
    , 0)

export const getChartDataFromVolumeHistory =
  (volumeHistory: IDexResponse['volumeHistory']): [Date, number][] =>
    volumeHistory.map(({ timestamp, dailyVolume }) => ([new Date(timestamp * 1000), summAllVolumes(dailyVolume)]))

export const formatVolumeHistoryToChartData = (volumeHistory: IDexResponse['volumeHistory']): IStackedBarChartProps['chartData'] => {
  const chartData = volumeHistory.reduce((acc, { dailyVolume, timestamp }) => {
    //different timestamp
    const rawItems = Object.entries(dailyVolume).reduce((acc, [chain, protVolumes]) => {
      //different chain
      const volumeAccrossProtocols = Object.entries(protVolumes).reduce((acc, [_, volume]) => {
        //different version
        if (typeof volume !== 'number') return acc
        // return sum accross protocols
        return acc += volume
      }, 0)
      acc.push({
        name: chain,
        data: [new Date(timestamp * 1000), volumeAccrossProtocols]
      })
      // return total volume by chain
      return acc
    }, [] as Array<{ name: IStackedBarChartProps['chartData'][0]['name'], data: IStackedBarChartProps['chartData'][0]['data'][0] }>)
    for (const rawItem of rawItems) {
      if (acc[rawItem.name])
        acc[rawItem.name].push(rawItem.data)
      else acc[rawItem.name] = [rawItem.data]
    }
    // return all data by chain
    return acc
  }, {} as IStackedBarChartProps['chartData'][0])
  return Object.entries(chartData).map(([name, data]) => ({ name: capitalizeFirstLetter(name), data })) as IStackedBarChartProps['chartData']
}

