import React, { useState } from 'react';
import { OptionTrade, OptionType } from '../types';
import { Plus, X, Calculator, ArrowRight, Pencil, Trash2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchPricesForTickers } from '../services/priceService';

interface OptionsJournalProps {
  trades: OptionTrade[];
  setTrades: React.Dispatch<React.SetStateAction<OptionTrade[]>>;
}

const OptionsJournal: React.FC<OptionsJournalProps> = ({ trades, setTrades }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<OptionTrade>>({
    type: OptionType.SHORT_PUT,
    status: 'OPEN',
    strikePrice: 0,
    premium: 0,
    collateralOrCost: 0,
    ticker: '',
    openDate: '',
    expiryDate: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'strikePrice' || name === 'premium' || name === 'collateralOrCost' 
        ? parseFloat(value) 
        : value
    }));
  };

  const calculateROI = (trade: OptionTrade | Partial<OptionTrade>) => {
    if (!trade.premium || !trade.collateralOrCost) return 0;
    
    if (trade.type === OptionType.SHORT_PUT) {
        return (trade.premium / trade.collateralOrCost) * 100;
    } else {
        if (trade.status === 'CLOSED' && trade.closePrice !== undefined) {
             const profit = trade.closePrice - trade.premium; 
             return (profit / trade.premium) * 100;
        }
        return 0;
    }
  };

  const handleUpdatePrices = async () => {
      // Explicitly type activeTickers as string[] to avoid inference as unknown[]
      const activeTickers: string[] = Array.from(new Set(trades.map(t => t.ticker).filter((t): t is string => !!t)));
      if (activeTickers.length === 0) return;

      setLoadingPrices(true);
      try {
          const newPrices = await fetchPricesForTickers(activeTickers);
          // Merge with existing prices to avoid losing data if some fail
          setPrices(prev => ({ ...prev, ...newPrices }));
      } catch (error) {
          alert('更新價格失敗，請稍後再試。');
      } finally {
          setLoadingPrices(false);
      }
  };

  const resetForm = () => {
      setFormData({
        type: OptionType.SHORT_PUT,
        status: 'OPEN',
        strikePrice: 0,
        premium: 0,
        collateralOrCost: 0,
        ticker: '',
        openDate: '',
        expiryDate: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (trade: OptionTrade) => {
    setFormData({
        type: trade.type,
        status: trade.status,
        ticker: trade.ticker,
        openDate: trade.openDate,
        expiryDate: trade.expiryDate,
        strikePrice: trade.strikePrice,
        premium: trade.premium,
        collateralOrCost: trade.collateralOrCost,
        notes: trade.notes,
        closePrice: trade.closePrice
    });
    setEditingId(trade.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
      if (confirm('確定要刪除此交易記錄嗎？')) {
          setTrades(trades.filter(t => t.id !== id));
          if (editingId === id) resetForm();
      }
  };

  const handleSave = () => {
    if (!formData.ticker || !formData.openDate || !formData.strikePrice) return;

    if (editingId) {
        // Update existing
        setTrades(trades.map(t => t.id === editingId ? {
            ...t,
            ticker: formData.ticker!.toUpperCase(),
            type: formData.type as OptionType,
            openDate: formData.openDate!,
            expiryDate: formData.expiryDate || '',
            strikePrice: Number(formData.strikePrice),
            premium: Number(formData.premium),
            collateralOrCost: Number(formData.collateralOrCost),
            status: formData.status as 'OPEN' | 'CLOSED' | 'EXPIRED',
            notes: formData.notes
        } : t));
    } else {
        // Create new
        const newTrade: OptionTrade = {
            id: Date.now().toString(),
            ticker: formData.ticker!.toUpperCase(),
            type: formData.type as OptionType,
            openDate: formData.openDate!,
            expiryDate: formData.expiryDate || '',
            strikePrice: Number(formData.strikePrice),
            premium: Number(formData.premium),
            collateralOrCost: Number(formData.collateralOrCost),
            status: formData.status as 'OPEN' | 'CLOSED' | 'EXPIRED',
            notes: formData.notes
        };
        setTrades([newTrade, ...trades]);
    }
    
    resetForm();
  };

  const renderDistanceToStrike = (trade: OptionTrade) => {
      const currentPrice = prices[trade.ticker];
      if (!currentPrice || trade.status !== 'OPEN') return <span className="text-gray-500">-</span>;

      // Distance % = (Current - Strike) / Current
      const diff = currentPrice - trade.strikePrice;
      const diffPercent = (diff / currentPrice) * 100;

      let isSafe = false;
      let label = '';
      let colorClass = '';

      if (trade.type === OptionType.SHORT_PUT) {
          // Short Put: Safe if Market > Strike (OTM)
          isSafe = currentPrice > trade.strikePrice;
          label = isSafe ? '價外 (OTM)' : '價內 (ITM)';
          colorClass = isSafe ? 'text-green-400' : 'text-red-400';
      } else {
          // Long Call: Profit if Market > Strike (ITM)
          isSafe = currentPrice > trade.strikePrice; // "Safe" here means profitable for Long Call
          label = isSafe ? '價內 (ITM)' : '價外 (OTM)';
          colorClass = isSafe ? 'text-green-400' : 'text-red-400';
      }

      return (
          <div className={`flex flex-col items-end ${colorClass}`}>
              <span className="font-bold flex items-center text-xs">
                  {isSafe ? <CheckCircle2 size={12} className="mr-1"/> : <AlertTriangle size={12} className="mr-1"/>}
                  {Math.abs(diffPercent).toFixed(1)}%
              </span>
              <span className="text-[10px] opacity-80">{label}</span>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-r from-blue-900/40 to-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">期權收益表 (Options Income)</h2>
                    <p className="text-gray-400 text-sm">
                        追踪你的 Short Put 及 Long Call 策略回報。
                    </p>
                </div>
                <button 
                  onClick={handleUpdatePrices}
                  disabled={loadingPrices}
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPrices ? 'animate-spin' : ''}`} />
                  <span>{loadingPrices ? '更新中...' : '更新現價'}</span>
                </button>
              </div>
              
              <div className="mt-6 flex gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-blue-900/30">
                      <div className="text-xs text-blue-400 uppercase font-semibold">總權利金收入 (Premium)</div>
                      <div className="text-2xl font-mono font-bold text-white mt-1">
                          ${trades.reduce((sum, t) => t.type === OptionType.SHORT_PUT ? sum + t.premium : sum, 0).toLocaleString()}
                      </div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-purple-900/30">
                      <div className="text-xs text-purple-400 uppercase font-semibold">Short Put 佔用保證金</div>
                      <div className="text-2xl font-mono font-bold text-white mt-1">
                          ${trades.filter(t => t.status === 'OPEN' && t.type === OptionType.SHORT_PUT).reduce((sum, t) => sum + t.collateralOrCost, 0).toLocaleString()}
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="flex flex-col justify-center">
             <button 
                onClick={() => { resetForm(); setShowForm(true); }}
                className="w-full h-full min-h-[120px] border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-white transition group"
             >
                 <div className="bg-slate-800 group-hover:bg-blue-600 p-3 rounded-full mb-2 transition">
                    <Plus className="w-6 h-6" />
                 </div>
                 <span className="font-medium">記錄新交易</span>
             </button>
          </div>
      </div>

      {/* Input Modal/Panel */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative animate-fade-in-up">
                <button onClick={resetForm} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X />
                </button>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Calculator className="mr-2 text-blue-500" /> 
                    {editingId ? '編輯期權記錄' : '新增期權記錄'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strategy Type */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs uppercase text-gray-500 mb-2 font-semibold">策略類型</label>
                        <div className="flex space-x-4">
                            <label className={`flex-1 cursor-pointer border rounded-xl p-3 text-center transition ${formData.type === OptionType.SHORT_PUT ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-700 text-gray-500 hover:border-slate-500'}`}>
                                <input type="radio" name="type" value={OptionType.SHORT_PUT} checked={formData.type === OptionType.SHORT_PUT} onChange={handleInputChange} className="hidden"/>
                                <span className="font-bold">Short Put</span>
                                <div className="text-xs opacity-70 mt-1">收租 (Bullish/Neutral)</div>
                            </label>
                            <label className={`flex-1 cursor-pointer border rounded-xl p-3 text-center transition ${formData.type === OptionType.LONG_CALL ? 'bg-green-600/20 border-green-500 text-green-400' : 'border-slate-700 text-gray-500 hover:border-slate-500'}`}>
                                <input type="radio" name="type" value={OptionType.LONG_CALL} checked={formData.type === OptionType.LONG_CALL} onChange={handleInputChange} className="hidden"/>
                                <span className="font-bold">Long Call</span>
                                <div className="text-xs opacity-70 mt-1">看升 (Bullish)</div>
                            </label>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">股票代號 (Ticker)</label>
                        <input type="text" name="ticker" value={formData.ticker || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" placeholder="e.g. TSLA" />
                    </div>
                    <div>
                         <label className="block text-xs uppercase text-gray-500 mb-1">行使價 (Strike)</label>
                         <input type="number" name="strikePrice" value={formData.strikePrice || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" placeholder="0.00" />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">開倉日期</label>
                        <input type="date" name="openDate" value={formData.openDate || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">到期日</label>
                        <input type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" />
                    </div>

                    <div>
                         <label className="block text-xs uppercase text-gray-500 mb-1">權利金 (Premium Total)</label>
                         <input type="number" name="premium" value={formData.premium || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" placeholder="$ Received/Paid" />
                    </div>
                    <div>
                         <label className="block text-xs uppercase text-gray-500 mb-1">
                             {formData.type === OptionType.SHORT_PUT ? '保證金 (Collateral)' : '總成本 (Cost)'}
                         </label>
                         <input type="number" name="collateralOrCost" value={formData.collateralOrCost || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" placeholder="$ Amount" />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition">
                        {editingId ? '儲存變更' : '儲存交易'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-950 text-gray-400 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">策略</th>
                        <th className="px-6 py-4">標的 (Ticker)</th>
                        <th className="px-6 py-4">現價 (Current)</th>
                        <th className="px-6 py-4 text-right">行使價 (Strike)</th>
                        <th className="px-6 py-4 text-right">距離 (Dist %)</th>
                        <th className="px-6 py-4 text-right">權利金</th>
                        <th className="px-6 py-4 text-right">保證金/成本</th>
                        <th className="px-6 py-4 text-right">回報率 (ROI)</th>
                        <th className="px-6 py-4 text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-slate-800/50 transition">
                            <td className="px-6 py-4">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${trade.type === OptionType.SHORT_PUT ? 'bg-blue-900/50 text-blue-400 border border-blue-900' : 'bg-green-900/50 text-green-400 border border-green-900'}`}>
                                    {trade.type === OptionType.SHORT_PUT ? 'Short Put' : 'Long Call'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-white">{trade.ticker}</div>
                                <div className="text-xs text-gray-500">{trade.expiryDate} 到期</div>
                            </td>
                            <td className="px-6 py-4">
                                {prices[trade.ticker] ? (
                                    <span className="text-white font-mono font-medium">${prices[trade.ticker]}</span>
                                ) : (
                                    <span className="text-gray-600 text-xs">--</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-300">${trade.strikePrice}</td>
                            <td className="px-6 py-4 text-right">
                                {renderDistanceToStrike(trade)}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-green-400">+${trade.premium}</td>
                            <td className="px-6 py-4 text-right font-mono text-gray-300">${trade.collateralOrCost}</td>
                            <td className="px-6 py-4 text-right">
                                <span className="font-bold text-blue-400">
                                    {calculateROI(trade).toFixed(2)}%
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button 
                                      onClick={() => handleEdit(trade)}
                                      className="text-gray-500 hover:text-blue-500 transition p-2 rounded-full hover:bg-slate-800"
                                      title="編輯"
                                  >
                                      <Pencil size={18} />
                                  </button>
                                  <button 
                                      onClick={() => handleDelete(trade.id)}
                                      className="text-gray-500 hover:text-red-500 transition p-2 rounded-full hover:bg-slate-800"
                                      title="刪除"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                     {trades.length === 0 && (
                        <tr>
                            <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                暫無交易記錄
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default OptionsJournal;