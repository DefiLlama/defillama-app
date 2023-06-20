const macro = [
  // https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
  ["2023-07-26 2:00 PM EDT", "FOMC"],
  ["2023-09-20 2:00 PM EDT", "FOMC"],
  ["2023-11-01 2:00 PM EDT", "FOMC"],
  ["2023-12-13 2:00 PM EDT", "FOMC"],

  // https://www.bls.gov/schedule/news_release/cpi.htm
  ["2023-07-12 08:30 AM EDT", "US CPI"],
  ["2023-08-10 08:30 AM EDT", "US CPI"],
  ["2023-09-13 08:30 AM EDT", "US CPI"],
  ["2023-10-12 08:30 AM EDT", "US CPI"],
  ["2023-11-14 08:30 AM EDT", "US CPI"],
  ["2023-12-12 08:30 AM EDT", "US CPI"],
]

const closes = [
  // Monthly and quarterly
  ["2023-06-30", "Q2 close"],
  ["2023-09-30", "Q3 close"],
  ["2023-12-31", "Q4 close"],
  ["2023-07-31", "Monthly close"],
  ["2023-08-31", "Monthly close"],
  ["2023-10-31", "Monthly close"],
  ["2023-11-30", "Monthly close"],
]

const cryptos = [
  ["2023-08-05", "LTC Halving"],
  ["2024-04-15", "BTC Halving"],
]

export default [
  ["Macro", macro],
  ["Close", closes],
  ["Crypto", cryptos],
] as [string, string[][]][]