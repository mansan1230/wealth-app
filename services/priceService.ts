
import { Asset, AssetType } from "../types";

/**
 * Mapping for common cryptocurrencies to CoinGecko IDs
 */
const COINGECKO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'DOGE': 'dogecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'LINK': 'chainlink'
};

/**
 * Fetches market prices using public market data APIs:
 * 1. CoinGecko API for Cryptocurrencies
 * 2. Yahoo Finance v8 API for Stocks (via CORS proxy)
 */
export const fetchMarketPrices = async (assets: Asset[]): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};
  const cryptoIds: string[] = [];
  const stockTickers: string[] = [];

  // 1. Separate Assets by Type
  assets.forEach(asset => {
    const ticker = asset.ticker?.toUpperCase() || asset.name.toUpperCase();
    
    if (asset.type === AssetType.CRYPTO) {
      const geckoId = COINGECKO_MAP[ticker] || asset.name.toLowerCase();
      cryptoIds.push(geckoId);
    } else if (asset.type === AssetType.STOCK) {
      stockTickers.push(ticker);
    }
  });

  // 2. Fetch Crypto Prices (CoinGecko) - Reliable public API
  if (cryptoIds.length > 0) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd`
      );
      if (response.ok) {
        const data = await response.json();
        
        assets.filter(a => a.type === AssetType.CRYPTO).forEach(asset => {
            const ticker = asset.ticker?.toUpperCase() || asset.name.toUpperCase();
            const geckoId = COINGECKO_MAP[ticker] || asset.name.toLowerCase();
            
            if (data[geckoId] && data[geckoId].usd) {
                const key = asset.ticker || asset.name;
                prices[key] = data[geckoId].usd;
            }
        });
      }
    } catch (error) {
      console.error("CoinGecko API Error:", error);
    }
  }

  // 3. Fetch Stock Prices (Yahoo Finance v8 Chart Endpoint)
  // v7 quote endpoint often returns "Unauthorized", v8 chart is more resilient for public access.
  if (stockTickers.length > 0) {
    // Process stocks in parallel but individually to use the more stable chart endpoint
    const stockPromises = stockTickers.map(async (ticker) => {
      try {
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

        const response = await fetch(proxyUrl);
        if (response.ok) {
          const wrapper = await response.json();
          const data = JSON.parse(wrapper.contents);
          
          if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const price = meta.regularMarketPrice;
            
            if (price !== undefined) {
              return { ticker, price: Number(price) };
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch price for ${ticker}:`, error);
      }
      return null;
    });

    const results = await Promise.all(stockPromises);
    results.forEach(res => {
      if (res) {
        // Find matching assets to ensure correct keying based on user input
        const matchedAsset = assets.find(a => 
            (a.ticker?.toUpperCase() === res.ticker.toUpperCase()) || 
            (a.name.toUpperCase() === res.ticker.toUpperCase())
        );
        const key = matchedAsset?.ticker || matchedAsset?.name || res.ticker;
        prices[key] = res.price;
      }
    });
  }

  return prices;
};

/**
 * Fetch prices for a list of tickers (string array).
 */
export const fetchPricesForTickers = async (tickers: string[]): Promise<Record<string, number>> => {
    if (tickers.length === 0) return {};

    const dummyAssets: Asset[] = tickers.map(t => ({
        id: t,
        name: t,
        ticker: t,
        type: COINGECKO_MAP[t.toUpperCase()] ? AssetType.CRYPTO : AssetType.STOCK,
        quantity: 0,
        currentPrice: 0,
        currency: 'USD'
    }));

    return fetchMarketPrices(dummyAssets);
};
