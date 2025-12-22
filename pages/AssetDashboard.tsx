import React, { useState, useMemo } from 'react';
import { Asset, AssetType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { fetchMarketPrices } from '../services/priceService';
import { Plus, Trash2, RefreshCw, Wallet, Bitcoin, TrendingUp, Pencil, X } from 'lucide-react';

interface AssetDashboardProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AssetDashboard: React.FC<AssetDashboardProps> = ({ assets, setAssets }) => {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAsset, setFormAsset] = useState<Partial<Asset>>({
    type: AssetType.STOCK,
    currency: 'USD',
    quantity: 0,
    currentPrice: 0,
    name: '',
    ticker: ''
  });

  // Calculate Total Net Worth
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.quantity * asset.currentPrice), 0);
  }, [assets]);

  // Prepare Chart Data
  const chartData = useMemo(() => {
    const data = assets.map(asset => ({
      name: asset.ticker || asset.name,
      value: asset.quantity * asset.currentPrice,
      type: asset.type
    }));
    return data.sort((a, b) => b.value - a.value);
  }, [assets]);

  const handleUpdatePrices = async () => {
    setLoading(true);
    try {
      const prices = await fetchMarketPrices(assets);
      setAssets(prev => prev.map(asset => {
        const key = asset.ticker || asset.name;
        // Check if key exists loosely (uppercase/lowercase)
        const matchedKey = Object.keys(prices).find(k => k.toLowerCase() === key.toLowerCase());
        
        if (matchedKey && prices[matchedKey]) {
          return {
            ...asset,
            currentPrice: prices[matchedKey],
            lastUpdated: new Date().toLocaleTimeString()
          };
        }
        return asset;
      }));
    } catch (error) {
      alert("更新價格失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormAsset({ 
      type: AssetType.STOCK, 
      currency: 'USD', 
      quantity: 0, 
      currentPrice: 0, 
      name: '', 
      ticker: '' 
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSaveAsset = () => {
    if (!formAsset.name || !formAsset.quantity) return;
    
    if (editingId) {
      // Update existing asset
      setAssets(assets.map(a => a.id === editingId ? {
        ...a,
        name: formAsset.name!,
        ticker: formAsset.ticker?.toUpperCase() || formAsset.name!.toUpperCase(),
        type: formAsset.type || AssetType.STOCK,
        quantity: Number(formAsset.quantity),
        currentPrice: Number(formAsset.currentPrice),
        currency: formAsset.currency || 'USD',
        lastUpdated: new Date().toLocaleDateString() // Mark as manually updated today
      } : a));
    } else {
      // Create new asset
      const asset: Asset = {
        id: Date.now().toString(),
        name: formAsset.name,
        ticker: formAsset.ticker?.toUpperCase() || formAsset.name.toUpperCase(),
        type: formAsset.type || AssetType.STOCK,
        quantity: Number(formAsset.quantity),
        currentPrice: Number(formAsset.currentPrice),
        currency: formAsset.currency || 'USD',
        lastUpdated: new Date().toLocaleDateString()
      };
      setAssets([...assets, asset]);
    }
    
    resetForm();
  };

  const handleEditClick = (asset: Asset) => {
    setFormAsset({
      name: asset.name,
      ticker: asset.ticker,
      type: asset.type,
      quantity: asset.quantity,
      currentPrice: asset.currentPrice,
      currency: asset.currency
    });
    setEditingId(asset.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定要刪除此資產嗎？')) {
      setAssets(assets.filter(a => a.id !== id));
      if (editingId === id) resetForm();
    }
  };

  const getTypeIcon = (type: AssetType) => {
    switch (type) {
      case AssetType.CASH: return <Wallet className="w-5 h-5 text-green-400" />;
      case AssetType.CRYPTO: return <Bitcoin className="w-5 h-5 text-orange-400" />;
      case AssetType.STOCK: return <TrendingUp className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={100} />
          </div>
          <h2 className="text-gray-400 text-sm font-medium mb-1">總資產價值 (Total Net Worth)</h2>
          <div className="text-4xl font-bold text-white tracking-tight">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg text-gray-500 font-normal">USD</span>
          </div>
          <div className="mt-6 flex items-center space-x-3">
            <button 
              onClick={handleUpdatePrices}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? '更新中...' : '更新市價 (AI)'}</span>
            </button>
            <button 
              onClick={() => {
                if (isFormOpen && editingId) {
                  // If form is open in edit mode, switch to add mode
                  resetForm();
                  setIsFormOpen(true);
                } else {
                  setIsFormOpen(!isFormOpen);
                  if (!isFormOpen) setEditingId(null);
                }
              }}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              <span>新增資產</span>
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg h-64 flex flex-col justify-center">
            {assets.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={chartData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                     ))}
                   </Pie>
                   <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                   />
                   <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                 </PieChart>
               </ResponsiveContainer>
            ) : (
                <div className="text-center text-gray-500">暫無資產數據</div>
            )}
        </div>
      </div>

      {/* Add/Edit Asset Form */}
      {isFormOpen && (
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl animate-fade-in relative">
          <button 
            onClick={resetForm}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? '編輯資產' : '新增資產'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
             <select 
                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formAsset.type}
                onChange={(e) => setFormAsset({...formAsset, type: e.target.value as AssetType})}
             >
                <option value={AssetType.STOCK}>股票 (Stock)</option>
                <option value={AssetType.CRYPTO}>加密貨幣 (Crypto)</option>
                <option value={AssetType.CASH}>現金 (Cash)</option>
             </select>
             <input 
                type="text" 
                placeholder="代號 (e.g. AAPL, BTC)" 
                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formAsset.ticker}
                onChange={(e) => setFormAsset({...formAsset, ticker: e.target.value, name: e.target.value})}
             />
             <input 
                type="number" 
                placeholder="數量" 
                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formAsset.quantity || ''}
                onChange={(e) => setFormAsset({...formAsset, quantity: parseFloat(e.target.value)})}
             />
              <input 
                type="number" 
                placeholder="平均成本/現價" 
                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formAsset.currentPrice || ''}
                onChange={(e) => setFormAsset({...formAsset, currentPrice: parseFloat(e.target.value)})}
             />
             <button 
                onClick={handleSaveAsset}
                className={`${editingId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'} text-white rounded-lg p-2.5 font-medium transition`}
             >
                {editingId ? '儲存變更' : '確認新增'}
             </button>
          </div>
        </div>
      )}

      {/* Asset List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white">資產列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-950 text-gray-400 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">類型</th>
                        <th className="px-6 py-4">資產名稱</th>
                        <th className="px-6 py-4 text-right">持有數量</th>
                        <th className="px-6 py-4 text-right">市價 (USD)</th>
                        <th className="px-6 py-4 text-right">總值</th>
                        <th className="px-6 py-4 text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-800/50 transition">
                            <td className="px-6 py-4 flex items-center space-x-2">
                                {getTypeIcon(asset.type)}
                                <span className="text-sm text-gray-300 font-medium">{asset.type}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-white">{asset.ticker}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-300">
                                {asset.quantity.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-300">
                                ${asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                {asset.lastUpdated && <div className="text-xs text-gray-600">Updated: {asset.lastUpdated}</div>}
                            </td>
                            <td className="px-6 py-4 text-right text-green-400 font-semibold">
                                ${(asset.quantity * asset.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button 
                                      onClick={() => handleEditClick(asset)}
                                      className="text-gray-500 hover:text-blue-500 transition p-2 rounded-full hover:bg-slate-800"
                                      title="編輯"
                                  >
                                      <Pencil size={18} />
                                  </button>
                                  <button 
                                      onClick={() => handleDelete(asset.id)}
                                      className="text-gray-500 hover:text-red-500 transition p-2 rounded-full hover:bg-slate-800"
                                      title="刪除"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {assets.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                尚未添加任何資產
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

export default AssetDashboard;
