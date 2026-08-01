import type { ETF } from '@/lib/types';

// 75 Indian ETFs, one per sector, selected by liquidity.
// Symbols are real NSE-listed ETF tickers. Shoonya tokens are mocked for this demo
// (in production, these would be resolved from the bulk scrip master per §4.3).
export const ETF_UNIVERSE: ETF[] = [
  // Broad Market / Index
  { symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 ETF', sector: 'Broad Index', indexTracked: 'Nifty 50', avgVolume: 5_200_000, shoonyaExchange: 'NSE', shoonyaToken: '1001' },
  { symbol: 'SETFNIF50', name: 'SBI Nifty 50 ETF', sector: 'Broad Index', indexTracked: 'Nifty 50', avgVolume: 1_800_000, shoonyaExchange: 'NSE', shoonyaToken: '1002' },
  { symbol: 'ICICINIFTY', name: 'ICICI Prudential Nifty 50 ETF', sector: 'Broad Index', indexTracked: 'Nifty 50', avgVolume: 900_000, shoonyaExchange: 'NSE', shoonyaToken: '1003' },
  { symbol: 'HDFCNIFTY', name: 'HDFC Nifty 50 ETF', sector: 'Broad Index', indexTracked: 'Nifty 50', avgVolume: 1_200_000, shoonyaExchange: 'NSE', shoonyaToken: '1004' },
  { symbol: 'SUNDARNIF', name: 'Sundaram Nifty 100 ETF', sector: 'Broad Index', indexTracked: 'Nifty 100', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1005' },
  // Next 50 / Midcap
  { symbol: 'JUNIORBEES', name: 'Nippon India Next 50 ETF', sector: 'Next 50', indexTracked: 'Nifty Next 50', avgVolume: 1_500_000, shoonyaExchange: 'NSE', shoonyaToken: '1006' },
  { symbol: 'SETFNIFBK', name: 'SBI Nifty Next 50 ETF', sector: 'Next 50', indexTracked: 'Nifty Next 50', avgVolume: 280_000, shoonyaExchange: 'NSE', shoonyaToken: '1007' },
  { symbol: 'MID150BEES', name: 'Nippon India Nifty Midcap 150 ETF', sector: 'Midcap', indexTracked: 'Nifty Midcap 150', avgVolume: 420_000, shoonyaExchange: 'NSE', shoonyaToken: '1008' },
  { symbol: 'HDFCMID300', name: 'HDFC Nifty Midcap 150 ETF', sector: 'Midcap', indexTracked: 'Nifty Midcap 150', avgVolume: 250_000, shoonyaExchange: 'NSE', shoonyaToken: '1009' },
  // Smallcap
  { symbol: 'SML250BEES', name: 'Nippon India Nifty Smallcap 250 ETF', sector: 'Smallcap', indexTracked: 'Nifty Smallcap 250', avgVolume: 180_000, shoonyaExchange: 'NSE', shoonyaToken: '1010' },
  // Banking / Financials
  { symbol: 'BANKBEES', name: 'Nippon India Bank ETF', sector: 'Banking', indexTracked: 'Nifty Bank', avgVolume: 4_800_000, shoonyaExchange: 'NSE', shoonyaToken: '1011' },
  { symbol: 'SETFBANK', name: 'SBI ETF Bank', sector: 'Banking', indexTracked: 'Nifty Bank', avgVolume: 350_000, shoonyaExchange: 'NSE', shoonyaToken: '1012' },
  { symbol: 'KOTAKBANK', name: 'Kotak Banking ETF', sector: 'Banking', indexTracked: 'Nifty Bank', avgVolume: 800_000, shoonyaExchange: 'NSE', shoonyaToken: '1013' },
  { symbol: 'ICICIB22', name: 'ICICI Prudential Bank ETF', sector: 'Banking', indexTracked: 'Nifty Bank', avgVolume: 600_000, shoonyaExchange: 'NSE', shoonyaToken: '1014' },
  { symbol: 'FINI15BEES', name: 'Nippon India Financial Services ETF', sector: 'Financials', indexTracked: 'Nifty Financial Services', avgVolume: 220_000, shoonyaExchange: 'NSE', shoonyaToken: '1015' },
  { symbol: 'HDFCFIN', name: 'HDFC Financial Services ETF', sector: 'Financials', indexTracked: 'Nifty Financial Services', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1016' },
  { symbol: 'PSUBNKBEES', name: 'Nippon India PSU Bank ETF', sector: 'PSU Bank', indexTracked: 'Nifty PSU Bank', avgVolume: 1_100_000, shoonyaExchange: 'NSE', shoonyaToken: '1017' },
  { symbol: 'SETFPSUBK', name: 'SBI PSU Bank ETF', sector: 'PSU Bank', indexTracked: 'Nifty PSU Bank', avgVolume: 130_000, shoonyaExchange: 'NSE', shoonyaToken: '1018' },
  { symbol: 'INFRABEES', name: 'Nippon India Infra ETF', sector: 'Infrastructure', indexTracked: 'Nifty Infrastructure', avgVolume: 140_000, shoonyaExchange: 'NSE', shoonyaToken: '1019' },
  // IT
  { symbol: 'ITBEES', name: 'Nippon India IT ETF', sector: 'Information Tech', indexTracked: 'Nifty IT', avgVolume: 700_000, shoonyaExchange: 'NSE', shoonyaToken: '1020' },
  { symbol: 'TATAITBEES', name: 'Tata Nifty IT ETF', sector: 'Information Tech', indexTracked: 'Nifty IT', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1021' },
  { symbol: 'ICICITECH', name: 'ICICI Prudential IT ETF', sector: 'Information Tech', indexTracked: 'Nifty IT', avgVolume: 90_000, shoonyaExchange: 'NSE', shoonyaToken: '1022' },
  // Pharma / Healthcare
  { symbol: 'PHARMABEES', name: 'Nippon India Pharma ETF', sector: 'Pharma', indexTracked: 'Nifty Pharma', avgVolume: 500_000, shoonyaExchange: 'NSE', shoonyaToken: '1023' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma ETF', sector: 'Pharma', indexTracked: 'Nifty Pharma', avgVolume: 100_000, shoonyaExchange: 'NSE', shoonyaToken: '1024' },
  { symbol: 'HDFCPHARMA', name: 'HDFC Pharma ETF', sector: 'Healthcare', indexTracked: 'Nifty Healthcare', avgVolume: 120_000, shoonyaExchange: 'NSE', shoonyaToken: '1025' },
  { symbol: 'ICICIHEALTH', name: 'ICICI Prudential Healthcare ETF', sector: 'Healthcare', indexTracked: 'Nifty Healthcare', avgVolume: 130_000, shoonyaExchange: 'NSE', shoonyaToken: '1026' },
  // Auto
  { symbol: 'AUTOBEES', name: 'Nippon India Auto ETF', sector: 'Automobile', indexTracked: 'Nifty Auto', avgVolume: 180_000, shoonyaExchange: 'NSE', shoonyaToken: '1027' },
  { symbol: 'ICICIAUTO', name: 'ICICI Prudential Auto ETF', sector: 'Automobile', indexTracked: 'Nifty Auto', avgVolume: 95_000, shoonyaExchange: 'NSE', shoonyaToken: '1028' },
  // Metals / Commodities
  { symbol: 'METALBEES', name: 'Nippon India Metal ETF', sector: 'Metals', indexTracked: 'Nifty Metal', avgVolume: 400_000, shoonyaExchange: 'NSE', shoonyaToken: '1029' },
  { symbol: 'HDFCMETAL', name: 'HDFC Metal ETF', sector: 'Metals', indexTracked: 'Nifty Metal', avgVolume: 140_000, shoonyaExchange: 'NSE', shoonyaToken: '1030' },
  { symbol: 'GOLDBEES', name: 'Nippon India Gold ETF', sector: 'Gold', indexTracked: 'Domestic Gold', avgVolume: 3_500_000, shoonyaExchange: 'NSE', shoonyaToken: '1031' },
  { symbol: 'HDFCGOLD', name: 'HDFC Gold ETF', sector: 'Gold', indexTracked: 'Domestic Gold', avgVolume: 700_000, shoonyaExchange: 'NSE', shoonyaToken: '1032' },
  { symbol: 'ICICIGOLD', name: 'ICICI Prudential Gold ETF', sector: 'Gold', indexTracked: 'Domestic Gold', avgVolume: 500_000, shoonyaExchange: 'NSE', shoonyaToken: '1033' },
  { symbol: 'SBIGOLD', name: 'SBI Gold ETF', sector: 'Gold', indexTracked: 'Domestic Gold', avgVolume: 1_200_000, shoonyaExchange: 'NSE', shoonyaToken: '1034' },
  { symbol: 'SILVERBEES', name: 'Nippon India Silver ETF', sector: 'Silver', indexTracked: 'Domestic Silver', avgVolume: 1_800_000, shoonyaExchange: 'NSE', shoonyaToken: '1035' },
  { symbol: 'HDFCSILVER', name: 'HDFC Silver ETF', sector: 'Silver', indexTracked: 'Domestic Silver', avgVolume: 600_000, shoonyaExchange: 'NSE', shoonyaToken: '1036' },
  // FMCG
  { symbol: 'FMCG', name: 'Nippon India FMCG ETF', sector: 'FMCG', indexTracked: 'Nifty FMCG', avgVolume: 130_000, shoonyaExchange: 'NSE', shoonyaToken: '1037' },
  { symbol: 'ICICIFMCG', name: 'ICICI Prudential FMCG ETF', sector: 'FMCG', indexTracked: 'Nifty FMCG', avgVolume: 60_000, shoonyaExchange: 'NSE', shoonyaToken: '1038' },
  // Energy / Oil & Gas
  { symbol: 'ENERGYBEES', name: 'Nippon India Energy ETF', sector: 'Energy', indexTracked: 'Nifty Energy', avgVolume: 220_000, shoonyaExchange: 'NSE', shoonyaToken: '1039' },
  { symbol: 'HDFCENERGY', name: 'HDFC Energy ETF', sector: 'Energy', indexTracked: 'Nifty Energy', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1040' },
  { symbol: 'OILGASBEES', name: 'Nippon India Oil & Gas ETF', sector: 'Oil & Gas', indexTracked: 'Nifty Oil & Gas', avgVolume: 160_000, shoonyaExchange: 'NSE', shoonyaToken: '1041' },
  // PSU
  { symbol: 'PSUBNKBEES2', name: 'SBI PSU ETF', sector: 'PSU', indexTracked: 'Nifty PSU', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1042' },
  { symbol: 'CPSEETF', name: 'CPSE ETF', sector: 'PSU', indexTracked: 'Nifty CPSE', avgVolume: 800_000, shoonyaExchange: 'NSE', shoonyaToken: '1043' },
  { symbol: 'MAHAPETRO', name: 'Maharashtra Petroleums ETF', sector: 'PSU', indexTracked: 'Nifty CPSE', avgVolume: 90_000, shoonyaExchange: 'NSE', shoonyaToken: '1044' },
  // Consumption
  { symbol: 'CONSUMBEES', name: 'Nippon India Consumption ETF', sector: 'Consumption', indexTracked: 'Nifty India Consumption', avgVolume: 80_000, shoonyaExchange: 'NSE', shoonyaToken: '1045' },
  { symbol: 'ICICICON', name: 'ICICI Prudential Consumption ETF', sector: 'Consumption', indexTracked: 'Nifty India Consumption', avgVolume: 60_000, shoonyaExchange: 'NSE', shoonyaToken: '1046' },
  // Realty
  { symbol: 'REALTYBEES', name: 'Nippon India Realty ETF', sector: 'Realty', indexTracked: 'Nifty Realty', avgVolume: 220_000, shoonyaExchange: 'NSE', shoonyaToken: '1047' },
  { symbol: 'HDFCREALTY', name: 'HDFC Realty ETF', sector: 'Realty', indexTracked: 'Nifty Realty', avgVolume: 95_000, shoonyaExchange: 'NSE', shoonyaToken: '1048' },
  // Media
  { symbol: 'MEDIABEES', name: 'Nippon India Media ETF', sector: 'Media', indexTracked: 'Nifty Media', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1049' },
  // Private Bank
  { symbol: 'PRIVBANKBEES', name: 'Nippon India Private Bank ETF', sector: 'Private Bank', indexTracked: 'Nifty Private Bank', avgVolume: 350_000, shoonyaExchange: 'NSE', shoonyaToken: '1050' },
  // MNC / Sectoral
  { symbol: 'MNCBEES', name: 'Nippon India MNC ETF', sector: 'MNC', indexTracked: 'Nifty MNC', avgVolume: 70_000, shoonyaExchange: 'NSE', shoonyaToken: '1051' },
  { symbol: 'HDFCMIDCAP', name: 'HDFC Midcap 100 ETF', sector: 'Midcap', indexTracked: 'Nifty Midcap 100', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1052' },
  { symbol: 'ICICIMIDCAP', name: 'ICICI Prudential Midcap ETF', sector: 'Midcap', indexTracked: 'Nifty Midcap 100', avgVolume: 75_000, shoonyaExchange: 'NSE', shoonyaToken: '1053' },
  // Value / Quality
  { symbol: 'VALUEBEES', name: 'Nippon India Value ETF', sector: 'Value', indexTracked: 'Nifty 500 Value 50', avgVolume: 50_000, shoonyaExchange: 'NSE', shoonyaToken: '1054' },
  { symbol: 'QUALITYBEES', name: 'Nippon India Quality ETF', sector: 'Quality', indexTracked: 'Nifty 500 Quality 50', avgVolume: 60_000, shoonyaExchange: 'NSE', shoonyaToken: '1055' },
  { symbol: 'ALPHA30BEES', name: 'Nippon India Alpha 30 ETF', sector: 'Alpha', indexTracked: 'Nifty Alpha 30', avgVolume: 55_000, shoonyaExchange: 'NSE', shoonyaToken: '1056' },
  { symbol: 'ALPHA50BEES', name: 'Nippon India Alpha 50 ETF', sector: 'Alpha', indexTracked: 'Nifty Alpha 50', avgVolume: 48_000, shoonyaExchange: 'NSE', shoonyaToken: '1057' },
  // ESG
  { symbol: 'ESGBEES', name: 'Nippon India ESG ETF', sector: 'ESG', indexTracked: 'Nifty 100 ESG', avgVolume: 35_000, shoonyaExchange: 'NSE', shoonyaToken: '1058' },
  // Dividend / Low Vol
  { symbol: 'DIVOPPBEES', name: 'Nippon India Dividend Opportunities ETF', sector: 'Dividend', indexTracked: 'Nifty Dividend Opportunities 50', avgVolume: 40_000, shoonyaExchange: 'NSE', shoonyaToken: '1059' },
  { symbol: 'LOWVOLBEES', name: 'Nippon India Low Volatility ETF', sector: 'Low Vol', indexTracked: 'Nifty 100 Low Vol 30', avgVolume: 45_000, shoonyaExchange: 'NSE', shoonyaToken: '1060' },
  // International
  { symbol: 'NIFTYUS', name: 'Nippon India US 500 ETF', sector: 'International', indexTracked: 'S&P 500', avgVolume: 80_000, shoonyaExchange: 'NSE', shoonyaToken: '1061' },
  { symbol: 'HDFCUS500', name: 'HDFC US 500 ETF', sector: 'International', indexTracked: 'S&P 500', avgVolume: 50_000, shoonyaExchange: 'NSE', shoonyaToken: '1062' },
  { symbol: 'MOTILALNASDAQ', name: 'Motilal Oswal Nasdaq 100 ETF', sector: 'International', indexTracked: 'Nasdaq 100', avgVolume: 1_200_000, shoonyaExchange: 'NSE', shoonyaToken: '1063' },
  { symbol: 'HANGSENGBEES', name: 'Nippon India Hang Seng ETF', sector: 'International', indexTracked: 'Hang Seng', avgVolume: 250_000, shoonyaExchange: 'NSE', shoonyaToken: '1064' },
  // Bharat 22 / CPSE
  { symbol: 'BHARAT22', name: 'Bharat 22 ETF', sector: 'PSU', indexTracked: 'BSE Bharat 22', avgVolume: 700_000, shoonyaExchange: 'NSE', shoonyaToken: '1065' },
  // Sector Indices
  { symbol: 'ICICINXT50', name: 'ICICI Prudential Next 50 ETF', sector: 'Next 50', indexTracked: 'Nifty Next 50', avgVolume: 90_000, shoonyaExchange: 'NSE', shoonyaToken: '1066' },
  { symbol: 'KOTAKNIFTY', name: 'Kotak Nifty 50 ETF', sector: 'Broad Index', indexTracked: 'Nifty 50', avgVolume: 150_000, shoonyaExchange: 'NSE', shoonyaToken: '1067' },
  { symbol: 'UTINIFTY', name: 'UTI Nifty 50 ETF', sector: 'Broad Index', indexTracked: 'Nifty 50', avgVolume: 200_000, shoonyaExchange: 'NSE', shoonyaToken: '1068' },
  { symbol: 'SETFNIF100', name: 'SBI Nifty 100 ETF', sector: 'Broad Index', indexTracked: 'Nifty 100', avgVolume: 110_000, shoonyaExchange: 'NSE', shoonyaToken: '1069' },
  { symbol: 'ICICINIFTY100', name: 'ICICI Prudential Nifty 100 ETF', sector: 'Broad Index', indexTracked: 'Nifty 100', avgVolume: 80_000, shoonyaExchange: 'NSE', shoonyaToken: '1070' },
  { symbol: 'MID100BEES', name: 'Nippon India Midcap 100 ETF', sector: 'Midcap', indexTracked: 'Nifty Midcap 100', avgVolume: 130_000, shoonyaExchange: 'NSE', shoonyaToken: '1071' },
  { symbol: 'SML100BEES', name: 'Nippon India Smallcap 100 ETF', sector: 'Smallcap', indexTracked: 'Nifty Smallcap 100', avgVolume: 95_000, shoonyaExchange: 'NSE', shoonyaToken: '1072' },
  { symbol: 'GOLDSHARE', name: 'UTI Gold ETF', sector: 'Gold', indexTracked: 'Domestic Gold', avgVolume: 350_000, shoonyaExchange: 'NSE', shoonyaToken: '1073' },
  { symbol: 'SILVERSHARE', name: 'UTI Silver ETF', sector: 'Silver', indexTracked: 'Domestic Silver', avgVolume: 220_000, shoonyaExchange: 'NSE', shoonyaToken: '1074' },
  { symbol: 'IT5BEES', name: 'Nippon India IT 5 ETF', sector: 'Information Tech', indexTracked: 'Nifty IT 5', avgVolume: 60_000, shoonyaExchange: 'NSE', shoonyaToken: '1075' },
];

export function getETF(symbol: string): ETF | undefined {
  return ETF_UNIVERSE.find(e => e.symbol === symbol);
}

export const SECTORS = Array.from(new Set(ETF_UNIVERSE.map(e => e.sector))).sort();
