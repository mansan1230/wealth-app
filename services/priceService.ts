
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
 * Fetches market prices using actual market data APIs:
 * 1. CoinGecko API for Cryptocurrencies
 * 2. Yahoo Finance API for Stocks (via CORS proxy)
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

  // 2. Fetch Crypto Prices (CoinGecko)
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

  // 3. Fetch Stock Prices (Yahoo Finance via Proxy)
  if (stockTickers.length > 0) {
    try {
      // Use allorigins proxy to bypass CORS for Yahoo Finance
      const symbols = stockTickers.join(',');
      const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

      const response = await fetch(proxyUrl);
      if (response.ok) {
        const wrapper = await response.json();
        // allorigins wraps the response in a 'contents' field as a string
        const data = JSON.parse(wrapper.contents);
        
        if (data.quoteResponse && data.quoteResponse.result) {
          data.quoteResponse.result.forEach((quote: any) => {
            const ticker = quote.symbol;
            const price = quote.regularMarketPrice;
            
            // Find matching assets to ensure correct keying
            const matchedAsset = assets.find(a => 
                (a.ticker?.toUpperCase() === ticker.toUpperCase()) || 
                (a.name.toUpperCase() === ticker.toUpperCase())
            );
            
            if (matchedAsset) {
                const key = matchedAsset.ticker || matchedAsset.name;
                prices[key] = Number(price);
            } else {
                prices[ticker] = Number(price);
            }
          });
        }
      }
    } catch (error) {
      console.error("Yahoo Finance Price Fetch Error:", error);
    }
  }

  return prices;
};

/**
 * Fetch prices for a list of tickers (string array).
 * Useful for Options Journal where we might not have full Asset objects.
 */
export const fetchPricesForTickers = async (tickers: string[]): Promise<Record<string, number>> => {
    if (tickers.length === 0) return {};

    // Create temporary asset objects to reuse the main function logic
    const dummyAssets: Asset[] = tickers.map(t => ({
        id: t,
        name: t,
        ticker: t,
        // Guess type: if in COINGECKO_MAP or typical crypto ticker, it's crypto
        type: COINGECKO_MAP[t.toUpperCase()] ? AssetType.CRYPTO : AssetType.STOCK,
        quantity: 0,
        currentPrice: 0,
        currency: 'USD'
    }));

    return fetchMarketPrices(dummyAssets);
};
