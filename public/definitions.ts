export const definitions = {
  "fees": {
    "common": "Total fees paid by users when using the protocol",
    "protocol": {
      "24h": "Total fees paid by users when using the protocol in the last 24 hours",
      "7d": "Total fees paid by users when using the protocol in the last 7 days",
      "30d": "Total fees paid by users when using the protocol in the last 30 days",
      "1y": "Total fees paid by users when using the protocol in the last 12 months",
      "monthlyAverage1y": "Average monthly fees paid by users in the last 12 months",
      "cumulative": "Total fees paid by users since the protocol was launched",
      "annualized": "Total fees paid by users when using the protocol in the last 30 days, multiplied by 12 to annualize it",
      "pf": "Market cap / annualized fees",
      "change1d": "Day-over-day percentage change in fees",
      "change7d": "Week-over-week percentage change in fees",
      "change1m": "Month-over-month percentage change in fees",
      "change7dover7d": "Change of last 7 days fees over the previous 7 days fees",
      "change30dover30d": "Change of last 30 days fees over the previous 30 days fees",
      "average1y": "Average monthly fees paid by users in the last 12 months"
    },
    "chain": {
      "24h": "Total fees paid by users when using the chain in the last 24 hours. Updates daily at 00:00 UTC",
      "7d": "Total fees paid by users when using the chain in the last 7 days. Updates daily at 00:00 UTC",
      "30d": "Total fees paid by users when using the chain in the last 30 days. Updates daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days fees over the previous 7 days fees"
    }
  },
  "revenue": {
    "common": "Revenue is subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers",
    "protocol": {
      "24h": "Total Revenue earned by the protocol in the last 24 hours",
      "7d": "Total Revenue earned by the protocol in the last 7 days",
      "30d": "Total Revenue earned by the protocol in the last 30 days",
      "1y": "Total Revenue earned by the protocol in the last 12 months",
      "monthlyAverage1y": "Average monthly revenue earned by the protocol in the last 12 months",
      "cumulative": "Total Revenue earned by the protocol since the protocol was launched",
      "annualized": "Total Revenue earned by the protocol in the last 30 days, multiplied by 12 to annualize it",
      "ps": "Market cap / annualized revenue",
      "change1d": "Day-over-day percentage change in revenue",
      "change7d": "Week-over-week percentage change in revenue",
      "change1m": "Month-over-month percentage change in revenue",
      "change7dover7d": "Change of last 7 days revenue over the previous 7 days revenue",
      "change30dover30d": "Change of last 30 days revenue over the previous 30 days revenue",
      "average1y": "Average monthly revenue earned by the protocol in the last 12 months"
    },
    "chain": {
      "24h": "Subset of fees that the chain collects for itself in the last 24 hours. Updates daily at 00:00 UTC",
      "7d": "Subset of fees that the chain collects for itself in the last 7 days. Updates daily at 00:00 UTC",
      "30d": "Subset of fees that the chain collects for itself in the last 30 days. Updates daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days fees over the previous 7 days fees"
    }
  },
  "appFees": {
    "common": "Total fees paid by users when using the apps on the chain",
    "chain": {
      "24h": "Total fees paid by users when using the apps on the chain in the last 24 hours. Excludes stablecoins, liquid staking apps, and gas fees. Updates daily at 00:00 UTC",
      "7d": "Total fees paid by users when using the apps on the chain in the last 7 days. Excludes stablecoins, liquid staking apps, and gas fees. Updates daily at 00:00 UTC",
      "30d": "Total fees paid by users when using the apps on the chain in the last 30 days. Excludes stablecoins, liquid staking apps, and gas fees. Updates daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days fees over the previous 7 days fees"
    }
  },
  "appRevenue": {
    "common": "Total revenue earned by the apps on the chain",
    "chain": {
      "24h": "Total revenue earned by the apps on the chain in the last 24 hours. Excludes stablecoins, liquid staking apps, and gas fees. Updates daily at 00:00 UTC",
      "7d": "Total revenue earned by the apps on the chain in the last 7 days. Excludes stablecoins, liquid staking apps, and gas fees. Updates daily at 00:00 UTC",
      "30d": "Total revenue earned by the apps on the chain in the last 30 days. Excludes stablecoins, liquid staking apps, and gas fees. Updates daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days revenue over the previous 7 days revenue"
    }
  },
  "holdersRevenue": {
    "common": "Holders Revenue is subset of revenue that is distributed to token holders by means of buyback and burn, burning fees or direct distribution to stakers",
    "protocol": {
      "24h": "Total revenue earned by token holders of the protocol in the last 24 hours",
      "7d": "Total revenue earned by token holders of the protocol in the last 7 days",
      "30d": "Total revenue earned by token holders of the protocol in the last 30 days",
      "1y": "Total revenue earned by token holders of the protocol in the last 12 months",
      "monthlyAverage1y": "Average monthly revenue earned by token holders of the protocol in the last 12 months",
      "cumulative": "Total revenue earned by token holders of the protocol since the protocol was launched",
      "annualized": "Total revenue earned by token holders of the protocol in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in revenue earned by token holders of the protocol",
      "change7d": "Week-over-week percentage change in revenue earned by token holders of the protocol",
      "change1m": "Month-over-month percentage change in revenue earned by token holders of the protocol",
      "change7dover7d": "Change of last 7 days revenue over the previous 7 days revenue",
      "change30dover30d": "Change of last 30 days revenue over the previous 30 days revenue",
      "average1y": "Average monthly revenue earned by token holders of the protocol in the last 12 months"
    },
    "chain": {
      "24h": "Total revenue earned by token holders of the protocols on the chain in the last 24 hours. Updates daily at 00:00 UTC",
      "7d": "Total revenue earned by token holders of the protocols on the chain in the last 7 days. Updates daily at 00:00 UTC",
      "30d": "Total revenue earned by token holders of the protocols on the chain in the last 30 days. Updates daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days revenue over the previous 7 days revenue"
    }
  },
  "rev": {
    "common": "Real Economic Value (Chain Fees + MEV Tips) of the chain",
    "chain": {
      "24h": "Real Economic Value (Chain Fees + MEV Tips) of the chain in the last 24 hours. Updates daily at 00:00 UTC",
      "7d": "Real Economic Value (Chain Fees + MEV Tips) of the chain in the last 7 days. Updates daily at 00:00 UTC",
      "30d": "Real Economic Value (Chain Fees + MEV Tips) of the chain in the last 30 days. Updates daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days real economic value over the previous 7 days real economic value"
    }
  },
  "earnings": {
    "common": "Net protocol earnings (Revenue - Incentives) by the protocol",
    "protocol": {
      "24h": "Net protocol earnings (Revenue - Incentives) by the protocol in the last 24 hours",
      "7d": "Net protocol earnings (Revenue - Incentives) by the protocol in the last 7 days",
      "30d": "Net protocol earnings (Revenue - Incentives) by the protocol in the last 30 days",
      "1y": "Net protocol earnings (Revenue - Incentives) by the protocol in the last 12 months",
      "monthlyAverage1y": "Average monthly net protocol earnings by the protocol in the last 12 months",
      "cumulative": "Total net protocol earnings by the protocol since it was launched",
      "annualized": "Total net protocol earnings by the protocol in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in net protocol earnings by the protocol",
      "change7d": "Week-over-week percentage change in net protocol earnings by the protocol",
      "change1m": "Month-over-month percentage change in net protocol earnings by the protocol",
      "change7dover7d": "Change of last 7 days net protocol earnings over the previous 7 days net protocol earnings",
      "change30dover30d": "Change of last 30 days net protocol earnings over the previous 30 days net protocol earnings",
      "average1y": "Average monthly net protocol earnings by the protocol in the last 12 months"
    },
    "chain": {
      "24h": "Net protocol earnings (Revenue - Incentives) by the protocols on the chain in the last 24 hours. Incentives are split propotionally to revenue on this chain. Updates daily at 00:00 UTC",
      "7d": "Net protocol earnings (Revenue - Incentives) by the protocols on the chain in the last 7 days. Incentives are split propotionally to revenue on this chain. Updates daily at 00:00 UTC",
      "30d": "Net protocol earnings (Revenue - Incentives) by the protocols on the chain in the last 30 days. Incentives are split propotionally to revenue on this chain. Updates daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days net protocol earnings over the previous 7 days net protocol earnings"
    }
  },
  "incentives": {
    "common": "Total incentives distributed to users through liquidity mining or incentive programs",
    "protocol": {
      "24h": "Total incentives distributed to users in the last 24 hours through liquidity mining or incentive programs",
      "7d": "Total incentives distributed to users in the last 7 days through liquidity mining or incentive programs",
      "30d": "Total incentives distributed to users in the last 30 days through liquidity mining or incentive programs",
      "1y": "Total incentives distributed to users in the last 12 months through liquidity mining or incentive programs",
      "monthlyAverage1y": "Average monthly incentives distributed to users in the last 12 months",
      "cumulative": "Total incentives distributed to users since the protocol was launched",
      "annualized": "Total incentives distributed to users in the last 30 days, multiplied by 12 to annualize it"
    }
  },
  "dexs": {
    "common": "Volume of all spot token swaps on the DEX",
    "protocol": {
      "24h": "Volume of all spot token swaps on the DEX in the last 24 hours",
      "7d": "Volume of all spot token swaps on the DEX in the last 7 days",
      "30d": "Volume of all spot token swaps on the DEX in the last 30 days",
      "1y": "Volume of all spot token swaps on the DEX in the last 12 months",
      "cumulative": "Total volume of all spot token swaps on the DEX since the DEX was launched",
      "annualized": "Total volume of all spot token swaps on the DEX in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in volume of all spot token swaps on the DEX",
      "change7d": "Week-over-week percentage change in volume of all spot token swaps on the DEX",
      "change1m": "Month-over-month percentage change in volume of all spot token swaps on the DEX",
      "change7dover7d": "Change of last 7 days volume over the previous 7 days volume",
      "change30dover30d": "Change of last 30 days volume over the previous 30 days volume",
      "average1y": "Average monthly volume of all spot token swaps on the DEX in the last 12 months",
      "marketShare24h": "Share of total 24 hours spot volume across tracked protocols",
      "marketShare7d": "Share of total 7 days spot volume across tracked protocols"
    },
    "chain": {
      "24h": "Volume of all spot token swaps on all DEXs on the chain in the last 24 hours. Updated daily at 00:00 UTC",
      "7d": "Volume of all spot token swaps on all DEXs on the chain in the last 7 days. Updated daily at 00:00 UTC",
      "30d": "Volume of all spot token swaps on all DEXs on the chain in the last 30 days. Updated daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days volume over the previous 7 days volume",
    }
  },
  "dexAggregators": {
    "common": "Volume of all spot token swaps routed through the DEX aggregator",
    "protocol": {
      "24h": "Volume of all spot token swaps routed through the DEX aggregator in the last 24 hours",
      "7d": "Volume of all spot token swaps routed through the DEX aggregator in the last 7 days",
      "30d": "Volume of all spot token swaps routed through the DEX aggregator in the last 30 days",
      "cumulative": "Total volume of all spot token swaps routed through the DEX aggregator since the DEX aggregator was launched",
      "annualized": "Total volume of all spot token swaps routed through the DEX aggregator in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in volume of all spot token swaps routed through the DEX aggregator",
      "change7d": "Week-over-week percentage change in volume of all spot token swaps routed through the DEX aggregator",
      "change1m": "Month-over-month percentage change in volume of all spot token swaps routed through the DEX aggregator",
      "change7dover7d": "Change of last 7 days volume over the previous 7 days volume",
      "change30dover30d": "Change of last 30 days volume over the previous 30 days volume",
      "average1y": "Average monthly volume in the last 12 months",
      "marketShare24h": "Share of total 24 hours DEX aggregator volume across tracked protocols",
      "marketShare7d": "Share of total 7 days DEX aggregator volume across tracked protocols"
    },
    "chain": {
      "24h": "Volume of all spot token swaps routed through all DEX aggregators on the chain in the last 24 hours. Updated daily at 00:00 UTC",
      "7d": "Volume of all spot token swaps routed through all DEX aggregators on the chain in the last 7 days. Updated daily at 00:00 UTC",
      "30d": "Volume of all spot token swaps routed through all DEX aggregators on the chain in the last 30 days. Updated daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days volume over the previous 7 days volume",
    }
  },
  "perps": {
    "common": "Notional volume of all trades including leverage on the perp exchange",
    "protocol": {
      "24h": "Notional volume of all trades including leverage on the perp exchange in the last 24 hours",
      "7d": "Notional volume of all trades including leverage on the perp exchange in the last 7 days",
      "30d": "Notional volume of all trades including leverage on the perp exchange in the last 30 days",
      "1y": "Notional volume of all trades including leverage on the perp exchange in the last 12 months",
      "cumulative": "Total notional volume of all trades including leverage on the perp exchange since the perp exchange was launched",
      "annualized": "Total notional volume of all trades including leverage on the perp exchange in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in notional volume of all trades including leverage on the perp exchange",
      "change7d": "Week-over-week percentage change in notional volume of all trades including leverage on the perp exchange",
      "change1m": "Month-over-month percentage change in notional volume of all trades including leverage on the perp exchange",
      "change7dover7d": "Change of last 7 days notional volume including leverage over the previous 7 days notional volume including leverage",
      "change30dover30d": "Change of last 30 days notional volume including leverage over the previous 30 days notional volume including leverage",
      "average1y": "Average monthly notional volume including leverage in the last 12 months"
    },
    "chain": {
      "24h": "Notional volume of all trades including leverage on all perp exchanges on the chain in the last 24 hours. Updated daily at 00:00 UTC",
      "7d": "Notional volume of all trades including leverage on all perp exchanges on the chain in the last 7 days. Updated daily at 00:00 UTC",
      "30d": "Notional volume of all trades including leverage on all perp exchanges on the chain in the last 30 days. Updated daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days notional volume including leverage over the previous 7 days notional volume including leverage",
    }
  },
  "perpsAggregators": {
    "common": "Notional volume of all trades including leverage routed through the perp aggregator",
    "protocol": {
      "24h": "Notional volume of all trades including leverage routed through the perp aggregator in the last 24 hours",
      "7d": "Notional volume of all trades including leverage routed through the perp aggregator in the last 7 days",
      "30d": "Notional volume of all trades including leverage routed through the perp aggregator in the last 30 days",
      "1y": "Notional volume of all trades including leverage routed through the perp aggregator in the last 12 months",
      "cumulative": "Total notional volume of all trades including leverage routed through the perp aggregator since the perp aggregator was launched",
      "annualized": "Total notional volume of all trades including leverage routed through the perp aggregator in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in notional volume of all trades including leverage routed through the perp aggregator",
      "change7d": "Week-over-week percentage change in notional volume of all trades including leverage routed through the perp aggregator",
      "change1m": "Month-over-month percentage change in notional volume of all trades including leverage routed through the perp aggregator",
      "change7dover7d": "Change of last 7 days notional volume including leverage over the previous 7 days notional volume including leverage",
      "change30dover30d": "Change of last 30 days notional volume including leverage over the previous 30 days notional volume including leverage",
      "average1y": "Average monthly notional volume including leverage in the last 12 months"
    },
    "chain": {
      "24h": "Notional volume of all trades including leverage routed through all perp aggregators on the chain in the last 24 hours. Updated daily at 00:00 UTC",
      "7d": "Notional volume of all trades including leverage routed through all perp aggregators on the chain in the last 7 days. Updated daily at 00:00 UTC",
      "30d": "Notional volume of all trades including leverage routed through all perp aggregators on the chain in the last 30 days. Updated daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days notional volume including leverage over the previous 7 days notional volume including leverage",
    }
  },
  "bridgeAggregators": {
    "common": "Sum of value of all assets that were bridged through the bridge aggregator",
    "protocol": {
      "24h": "Sum of value of all assets that were bridged through the bridge aggregator in the last 24 hours",
      "7d": "Sum of value of all assets that were bridged through the bridge aggregator in the last 7 days",
      "30d": "Sum of value of all assets that were bridged through the bridge aggregator in the last 30 days",
      "1y": "Sum of value of all assets that were bridged through the bridge aggregator in the last 12 months",
      "cumulative": "Sum of value of all assets that were bridged through the bridge aggregator since the bridge aggregator was launched",
      "annualized": "Sum of value of all assets that were bridged through the bridge aggregator in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in sum of value of all assets that were bridged through the bridge aggregator",
      "change7d": "Week-over-week percentage change in sum of value of all assets that were bridged through the bridge aggregator",
      "change1m": "Month-over-month percentage change in sum of value of all assets that were bridged through the bridge aggregator",
      "change7dover7d": "Change of last 7 days sum of value over the previous 7 days sum of value",
      "change30dover30d": "Change of last 30 days sum of value over the previous 30 days sum of value",
      "average1y": "Average monthly sum of value of all assets that were bridged through the bridge aggregator in the last 12 months",
      "marketShare24h": "Share of total 24 hours bridge aggregator volume across tracked protocols",
      "marketShare7d": "Share of total 7 days bridge aggregator volume across tracked protocols"
    },
    "chain": {
      "24h": "Sum of value of all assets that were bridged through all bridge aggregators on the chain in the last 24 hours. Updated daily at 00:00 UTC",
      "7d": "Sum of value of all assets that were bridged through all bridge aggregators on the chain in the last 7 days. Updated daily at 00:00 UTC",
      "30d": "Sum of value of all assets that were bridged through all bridge aggregators on the chain in the last 30 days. Updated daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days sum of value over the previous 7 days sum of value",
    }
  },
  "optionsPremium": {
    "common": "Sum of value paid buying and selling options on the exchange",
    "protocol": {
      "24h": "Sum of value paid buying and selling options on the exchange in the last 24 hours",
      "7d": "Sum of value paid buying and selling options on the exchange in the last 7 days",
      "30d": "Sum of value paid buying and selling options on the exchange in the last 30 days",
      "cumulative": "Sum of value paid buying and selling options on the exchange since the exchange was launched",
      "annualized": "Sum of value paid buying and selling options on the exchange in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in sum of value paid buying and selling options on the exchange",
      "change7d": "Week-over-week percentage change in sum of value paid buying and selling options on the exchange",
      "change1m": "Month-over-month percentage change in sum of value paid buying and selling options on the exchange",
      "change7dover7d": "Change of last 7 days sum of value over the previous 7 days sum of value",
      "change30dover30d": "Change of last 30 days sum of value over the previous 30 days sum of value",
      "average1y": "Average monthly sum of value paid buying and selling options on the exchange in the last 12 months",
      "marketShare24h": "Share of total 24 hours options premium volume across tracked protocols",
      "marketShare7d": "Share of total 7 days options premium volume across tracked protocols"
    },
    "chain": {
      "24h": "Sum of value paid buying and selling options on all exchanges on the chain in the last 24 hours. Updated daily at 00:00 UTC",
      "7d": "Sum of value paid buying and selling options on all exchanges on the chain in the last 7 days. Updated daily at 00:00 UTC",
      "30d": "Sum of value paid buying and selling options on all exchanges on the chain in the last 30 days. Updated daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days sum of value over the previous 7 days sum of value",
    }
  },
  "optionsNotional": {
    "common": "Sum of the notional value of all options that have been traded on the exchange",
    "protocol": {
      "24h": "Sum of the notional value of all options that have been traded on the exchange in the last 24 hours",
      "7d": "Sum of the notional value of all options that have been traded on the exchange in the last 7 days",
      "30d": "Sum of the notional value of all options that have been traded on the exchange in the last 30 days",
      "cumulative": "Sum of the notional value of all options that have been traded on the exchange since the exchange was launched",
      "annualized": "Sum of the notional value of all options that have been traded on the exchange in the last 30 days, multiplied by 12 to annualize it",
      "change1d": "Day-over-day percentage change in sum of the notional value of all options that have been traded on the exchange",
      "change7d": "Week-over-week percentage change in sum of the notional value of all options that have been traded on the exchange",
      "change1m": "Month-over-month percentage change in sum of the notional value of all options that have been traded on the exchange",
      "change7dover7d": "Change of last 7 days sum of the notional value over the previous 7 days sum of the notional value",
      "change30dover30d": "Change of last 30 days sum of the notional value over the previous 30 days sum of the notional value",
      "average1y": "Average monthly sum of the notional value of all options that have been traded on the exchange in the last 12 months",
      "marketShare24h": "Share of total 24 hours options notional volume across tracked protocols",
      "marketShare7d": "Share of total 7 days options notional volume across tracked protocols"
    },
    "chain": {
      "24h": "Sum of the notional value of all options that have been traded on all exchanges on the chain in the last 24 hours. Updated daily at 00:00 UTC",
      "7d": "Sum of the notional value of all options that have been traded on all exchanges on the chain in the last 7 days. Updated daily at 00:00 UTC",
      "30d": "Sum of the notional value of all options that have been traded on all exchanges on the chain in the last 30 days. Updated daily at 00:00 UTC",
      "change7dover7d": "Change of last 7 days sum of the notional value over the previous 7 days sum of the notional value",
    }
  },
  "openInterest": {
    "common": "Total notional value of all outstanding perpetual futures positions",
    "protocol": "Total notional value of all outstanding perpetual futures positions",
    "chain": "Total notional value of all outstanding perpetual futures positions on all perp exchanges on the chain, updated daily at 00:00 UTC"
  }
} as const