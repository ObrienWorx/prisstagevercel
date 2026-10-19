import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Tab = 'gainers' | 'losers' | '52h' | '52l';

type YahooQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
};

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  Accept: '*/*',
};

// Top ~120 ASX stocks by market cap for reliable coverage
const ASX_TICKERS = [
  'CBA.AX','BHP.AX','CSL.AX','NAB.AX','WBC.AX','ANZ.AX','WES.AX','MQG.AX','RIO.AX','TLS.AX',
  'GMG.AX','WOW.AX','COL.AX','FMG.AX','REA.AX','TCL.AX','ALL.AX','STO.AX','IAG.AX','QBE.AX',
  'ASX.AX','CWY.AX','MPL.AX','ORG.AX','SHL.AX','APA.AX','JHX.AX','XRO.AX','QAN.AX','CPU.AX',
  'WDS.AX','MIN.AX','AZJ.AX','BXB.AX','ALD.AX','IEL.AX','ORI.AX','SEK.AX','NST.AX','EVN.AX',
  'TWE.AX','NXT.AX','ALX.AX','ALQ.AX','SOL.AX','PME.AX','SUN.AX','AMP.AX','BOQ.AX','BEN.AX',
  'VCX.AX','SCG.AX','GPT.AX','DXS.AX','CLW.AX','SCP.AX','MGR.AX','CHC.AX','ABP.AX','BWP.AX',
  'AMC.AX','IPL.AX','SKI.AX','ANN.AX','OZL.AX','NHC.AX','WHC.AX','S32.AX','IGO.AX','LYC.AX',
  'PLS.AX','AWC.AX','ILU.AX','SFR.AX','29M.AX','AKE.AX','PAN.AX','SIR.AX','CXO.AX','NIC.AX',
  'HVN.AX','JBH.AX','SUL.AX','ARB.AX','KGN.AX','ELD.AX','GWA.AX','DLI.AX','PPT.AX','PTM.AX',
  'MFG.AX','VTI.AX','PDL.AX','NAN.AX','MXT.AX','GQG.AX','HUB.AX','CIE.AX','NWL.AX','WEB.AX',
  'CTD.AX','FLT.AX','CVL.AX','OFX.AX','CAR.AX','APX.AX','WTC.AX','AD8.AX','NEA.AX','NTO.AX',
  'CUV.AX','PAR.AX','HLS.AX','RHC.AX','RAC.AX','EBO.AX','CAJ.AX','IDX.AX','SIG.AX','API.AX',
].map(t => t.toUpperCase());

let creds: { cookie: string; crumb: string; ts: number } | null = null;
async function getCreds() {
  if (creds && Date.now() - creds.ts < 30 * 60 * 1000) return creds;
  const r = await fetch('https://fc.yahoo.com/', { headers: UA });
  const jar = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
  const cookie = jar.map((c) => c.split(';')[0]).join('; ');
  const crumb = (await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { ...UA, cookie } }).then((res) => res.text())).trim();
  if (!cookie || !crumb || crumb.startsWith('{') || crumb.length > 40) throw new Error('Failed to obtain Yahoo crumb');
  creds = { cookie, crumb, ts: Date.now() };
  return creds;
}

async function fetchQuotes(tickers: string[]): Promise<YahooQuote[]> {
  const { cookie, crumb } = await getCreds();
  const symbols = tickers.join(',');
  const res = await fetch(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}&region=AU&lang=en-AU`,
    { headers: { ...UA, cookie } }
  );
  if (!res.ok) { creds = null; throw new Error(`quote HTTP ${res.status}`); }
  const json = await res.json();
  return json?.quoteResponse?.result ?? [];
}

async function getAllQuotes(): Promise<YahooQuote[]> {
  const CHUNK = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < ASX_TICKERS.length; i += CHUNK) {
    chunks.push(ASX_TICKERS.slice(i, i + CHUNK));
  }
  const results = await Promise.all(chunks.map(fetchQuotes));
  return results.flat();
}

function isAsxOpen(): boolean {
  const now = new Date();
  const sydney = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const day = sydney.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = sydney.getHours(), m = sydney.getMinutes();
  const mins = h * 60 + m;
  return mins >= 10 * 60 && mins < 16 * 60 + 15;
}

function toRow(q: YahooQuote) {
  return {
    ticker: q.symbol.replace(/\.AX$/i, ''),
    name: q.shortName || q.longName || q.symbol,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePct: q.regularMarketChangePercent ?? 0,
  };
}

const cache = new Map<Tab, { data: ReturnType<typeof toRow>[]; updatedAt: string; ts: number }>();
let universeCache: { quotes: YahooQuote[]; ts: number } | null = null;

async function getUniverse(): Promise<YahooQuote[]> {
  if (universeCache && Date.now() - universeCache.ts < 5 * 60 * 1000) return universeCache.quotes;
  const quotes = await getAllQuotes();
  universeCache = { quotes, ts: Date.now() };
  return quotes;
}

async function buildTab(tab: Tab): Promise<ReturnType<typeof toRow>[]> {
  const universe = await getUniverse();
  const valid = universe.filter(q => q.regularMarketPrice && q.regularMarketChangePercent !== undefined);

  if (tab === 'gainers') {
    return valid
      .filter(q => (q.regularMarketChangePercent ?? 0) > 0 && (q.regularMarketChangePercent ?? 0) < 300)
      .sort((a, b) => (b.regularMarketChangePercent ?? 0) - (a.regularMarketChangePercent ?? 0))
      .slice(0, 6).map(toRow);
  }
  if (tab === 'losers') {
    return valid
      .filter(q => (q.regularMarketChangePercent ?? 0) < 0 && (q.regularMarketChangePercent ?? 0) > -300)
      .sort((a, b) => (a.regularMarketChangePercent ?? 0) - (b.regularMarketChangePercent ?? 0))
      .slice(0, 6).map(toRow);
  }
  if (tab === '52h') {
    return valid
      .filter(q => q.fiftyTwoWeekHigh && q.regularMarketPrice! / q.fiftyTwoWeekHigh! >= 0.95)
      .sort((a, b) => (b.regularMarketPrice! / b.fiftyTwoWeekHigh!) - (a.regularMarketPrice! / a.fiftyTwoWeekHigh!))
      .slice(0, 6).map(toRow);
  }
  return valid
    .filter(q => q.fiftyTwoWeekLow && q.regularMarketPrice! / q.fiftyTwoWeekLow! <= 1.05)
    .sort((a, b) => (a.regularMarketPrice! / a.fiftyTwoWeekLow!) - (b.regularMarketPrice! / b.fiftyTwoWeekLow!))
    .slice(0, 6).map(toRow);
}

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') ?? 'gainers') as Tab;

  const cached = cache.get(tab);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
    return NextResponse.json({ data: cached.data, updatedAt: cached.updatedAt, marketClosed: !isAsxOpen() });
  }

  if (!isAsxOpen()) {
    if (cached) return NextResponse.json({ data: cached.data, updatedAt: cached.updatedAt, marketClosed: true });
    return NextResponse.json({ data: [], updatedAt: null, marketClosed: true });
  }

  try {
    const data = await buildTab(tab);
    const updatedAt = new Date().toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    cache.set(tab, { data, updatedAt, ts: Date.now() });
    return NextResponse.json({ data, updatedAt, marketClosed: false });
  } catch (e) {
    if (cached) return NextResponse.json({ data: cached.data, updatedAt: cached.updatedAt, marketClosed: false });
    return NextResponse.json({ data: [], updatedAt: null, error: String(e), marketClosed: false });
  }
}
