import { v1Client } from '../apollo/client'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { getPercentChange, get2DayPercentChange } from '../utils'
import { V1_DATA_QUERY } from '../apollo/queries'
import weekOfYear from 'dayjs/plugin/weekOfYear'

dayjs.extend(utc)
dayjs.extend(weekOfYear)

export async function getV1Data() {

}
