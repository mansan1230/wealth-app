import { GoogleGenAI } from "@google/genai";
import { Asset, AssetType } from "../types";

// Safely retrieve API Key handling various environments (Vite, Node, etc.)
const getApiKey = (): string => {
  let key = '';
  
  // 1. Try Vite (import.meta.env)
  try {
    // Check if import.meta exists and has env property before accessing
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY || '';
    }
  } catch (e) {
    console.warn("Error reading import.meta.env", e);
  }

  // 2. Fallback: Try process.env (Node.js/CI)
  if (!key) {
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env) {
        // @ts-ignore
        key = process.env.VITE_API_KEY || process.env.API_KEY || '';
      }
    } catch (e) {
      // Ignore process errors
    }
  }

  return key;
};

const apiKey = getApiKey();

// Initialize Gemini safely
let ai: GoogleGenAI;
try {
    ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
} catch (error) {
    console.error("Failed to initialize Gemini AI", error);
}

// Mapping for common cryptocurrencies to CoinGecko IDs
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
 * Fetches market prices using a hybrid approach:
 * 1. CoinGecko API for Cryptocurrencies (Free, fast, no key required)
 * 2. Gemini Search Grounding for Stocks (Uses your existing API Key)
 */
export const fetchMarketPrices = async (assets: Asset[]): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};
  const cryptoIds: string[] = [];
  const stockTickers: string[] = [];

  // 1. Separate Assets by Type
  assets.forEach(asset => {
    const ticker = asset.ticker?.toUpperCase() || asset.name.toUpperCase();
    
    if (asset.type === AssetType.CRYPTO) {
      // Try to find a mapped ID, otherwise use name as ID (hit or miss)
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
                // Key the result by the asset's ticker/name to match back in UI
                const key = asset.ticker || asset.name;
                prices[key] = data[geckoId].usd;
            }
        });
      }
    } catch (error) {
      console.error("CoinGecko API Error:", error);
    }
  }

  // 3. Fetch Stock Prices (Gemini Search Grounding)
  if (stockTickers.length > 0) {
    try {
      if (!apiKey || apiKey === 'dummy-key') {
        console.warn("No valid API Key found. Skipping stock price fetch.");
        return prices;
      }

      // We ask Gemini to search for prices and format as JSON
      const prompt = `
        Find the latest real-time market price in USD for these stock tickers: ${stockTickers.join(', ')}.
        Return ONLY a JSON object where the key is the ticker symbol (e.g. AAPL) and the value is the numeric price.
        Example: { "AAPL": 150.25, "TSLA": 200.50 }
        Do not include markdown blocks or any other text.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }], // Enable live search
        }
      });

      const text = response.text || '';
      // Remove potential markdown code blocks
      const cleanJson = text.replace(/```json|```/g, '').trim();
      
      try {
        const stockData = JSON.parse(cleanJson);
        Object.entries(stockData).forEach(([ticker, price]) => {
             // Find matching assets to ensure correct keying
             // We match loosely to handle case sensitivity
             const matchedAsset = assets.find(a => 
                 (a.ticker?.toUpperCase() === ticker.toUpperCase()) || 
                 (a.name.toUpperCase() === ticker.toUpperCase())
             );
             
             if (matchedAsset) {
                 const key = matchedAsset.ticker || matchedAsset.name;
                 prices[key] = Number(price);
             } else {
                 // Fallback if strict match fails, just use the ticker returned
                 prices[ticker] = Number(price);
             }
        });
      } catch (e) {
        console.error("Failed to parse stock price JSON:", text);
      }

    } catch (error) {
      console.error("Gemini Price Fetch Error:", error);
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
        // Guess type: if in COINGECKO_MAP, it's crypto, else assume stock
        type: COINGECKO_MAP[t.toUpperCase()] ? AssetType.CRYPTO : AssetType.STOCK,
        quantity: 0,
        currentPrice: 0,
        currency: 'USD'
    }));

    return fetchMarketPrices(dummyAssets);
};
