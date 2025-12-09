
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import AssetDashboard from './pages/AssetDashboard';
import OptionsJournal from './pages/OptionsJournal';
import MonthlyPnL from './pages/MonthlyPnL';
import AirdropTracker from './pages/AirdropTracker';
import { Asset, OptionTrade, AssetType, AirdropProject, PnLEntry, SyncConfig } from './types';
import { LayoutDashboard, LineChart, Activity, PieChart, CheckSquare, Cloud, Upload, Download, Settings, Save, AlertCircle } from 'lucide-react';

// Custom Hook for LocalStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Sidebar Navigation Component
const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link 
            to={to} 
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-400 hover:text-white hover:bg-slate-800'
            }`}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </Link>
    );
};

const App: React.FC = () => {
  // Global State
  const [assets, setAssets] = useLocalStorage<Asset[]>('smartwealth_assets', [
      { id: '1', name: 'Apple', ticker: 'AAPL', type: AssetType.STOCK, quantity: 50, currentPrice: 175.50, currency: 'USD' },
      { id: '2', name: 'Bitcoin', ticker: 'BTC', type: AssetType.CRYPTO, quantity: 0.5, currentPrice: 64000, currency: 'USD' },
      { id: '3', name: 'Cash Reserve', ticker: 'USD', type: AssetType.CASH, quantity: 25000, currentPrice: 1, currency: 'USD' }
  ]);

  const [trades, setTrades] = useLocalStorage<OptionTrade[]>('smartwealth_trades', []);
  const [manualPnL, setManualPnL] = useLocalStorage<PnLEntry[]>('smartwealth_pnl', []);
  const [airdrops, setAirdrops] = useLocalStorage<AirdropProject[]>('smartwealth_airdrops', [
      { id: '1', name: 'Example Layer2', status: 'Farming', notes: 'Bridge weekly', twitterUrl: 'https://twitter.com/example', priority: 'High' }
  ]);

  // Sync State
  const [syncConfig, setSyncConfig] = useLocalStorage<SyncConfig>('smartwealth_sync_config', {
      githubToken: '',
      gistId: ''
  });
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Gist Operations
  const handleUploadToGist = async () => {
      if (!syncConfig.githubToken) {
          alert("請先設定 GitHub Token");
          setShowSyncSettings(true);
          return;
      }

      setSyncStatus('loading');
      setSyncMessage('Uploading...');

      const payload = {
          assets,
          trades,
          manualPnL,
          airdrops,
          lastUpdated: new Date().toISOString()
      };

      const files = {
          "smartwealth_data.json": {
              content: JSON.stringify(payload, null, 2)
          }
      };

      try {
          let url = 'https://api.github.com/gists';
          let method = 'POST'; // Default to create new

          // If we have an ID, try to update it
          if (syncConfig.gistId) {
              url = `https://api.github.com/gists/${syncConfig.gistId}`;
              method = 'PATCH';
          }

          const response = await fetch(url, {
              method,
              headers: {
                  'Authorization': `token ${syncConfig.githubToken}`,
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  description: "SmartWealth HK Backup Data",
                  public: false, // Private Gist
                  files
              })
          });

          if (!response.ok) {
              if (response.status === 404 && syncConfig.gistId) {
                  // ID invalid, try creating new one?
                  throw new Error("Gist ID not found. Clear ID to create new.");
              }
              throw new Error("GitHub API Error");
          }

          const data = await response.json();
          
          // Save the Gist ID if it was a new creation
          if (!syncConfig.gistId) {
              setSyncConfig(prev => ({ ...prev, gistId: data.id }));
          }
          
          setSyncConfig(prev => ({ ...prev, lastSyncTime: new Date().toLocaleString() }));
          setSyncStatus('success');
          setSyncMessage('Upload Successful!');
          setTimeout(() => setSyncStatus('idle'), 3000);

      } catch (error: any) {
          console.error(error);
          setSyncStatus('error');
          setSyncMessage(error.message || 'Upload failed');
      }
  };

  const handleDownloadFromGist = async () => {
      if (!syncConfig.githubToken || !syncConfig.gistId) {
          alert("請確保已設定 Token 和 Gist ID");
          setShowSyncSettings(true);
          return;
      }

      setSyncStatus('loading');
      setSyncMessage('Downloading...');

      try {
          const response = await fetch(`https://api.github.com/gists/${syncConfig.gistId}`, {
              headers: {
                  'Authorization': `token ${syncConfig.githubToken}`,
              }
          });

          if (!response.ok) throw new Error("Failed to fetch Gist");

          const data = await response.json();
          const fileContent = data.files["smartwealth_data.json"]?.content;

          if (!fileContent) throw new Error("Invalid Gist format");

          const parsed = JSON.parse(fileContent);

          // Restore State
          if (parsed.assets) setAssets(parsed.assets);
          if (parsed.trades) setTrades(parsed.trades);
          if (parsed.manualPnL) setManualPnL(parsed.manualPnL);
          if (parsed.airdrops) setAirdrops(parsed.airdrops);

          setSyncConfig(prev => ({ ...prev, lastSyncTime: new Date().toLocaleString() }));
          setSyncStatus('success');
          setSyncMessage('Data Restored!');
          setTimeout(() => setSyncStatus('idle'), 3000);

      } catch (error: any) {
          console.error(error);
          setSyncStatus('error');
          setSyncMessage('Download failed');
      }
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans text-gray-100">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col z-20">
            <div className="flex items-center space-x-3 mb-10 px-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Activity className="text-white w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">SmartWealth</h1>
            </div>

            <nav className="space-y-2 flex-1">
                <NavItem to="/" icon={LayoutDashboard} label="資產總覽 (Assets)" />
                <NavItem to="/options" icon={LineChart} label="期權收益 (Options)" />
                <NavItem to="/pnl" icon={PieChart} label="每月損益 (P&L)" />
                <NavItem to="/airdrops" icon={CheckSquare} label="空投任務 (Airdrop)" />
            </nav>
            
            {/* Cloud Sync Section */}
            <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm font-semibold">
                        <Cloud size={16} />
                        <span>Cloud Sync</span>
                    </div>
                    <button 
                        onClick={() => setShowSyncSettings(!showSyncSettings)} 
                        className="text-gray-500 hover:text-white transition"
                    >
                        <Settings size={14} />
                    </button>
                </div>

                {showSyncSettings ? (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-3 mb-3 animate-fade-in">
                        <div>
                            <label className="block text-gray-500 mb-1">GitHub Token (Gist)</label>
                            <input 
                                type="password" 
                                value={syncConfig.githubToken}
                                onChange={(e) => setSyncConfig({...syncConfig, githubToken: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white outline-none focus:border-blue-500"
                                placeholder="ghp_..."
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 mb-1">Gist ID (Auto-filled)</label>
                            <input 
                                type="text" 
                                value={syncConfig.gistId}
                                onChange={(e) => setSyncConfig({...syncConfig, gistId: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white outline-none focus:border-blue-500"
                                placeholder="Generated on upload"
                            />
                        </div>
                        <div className="text-[10px] text-gray-600">
                           Token 需要有 `gist` 權限。
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={handleUploadToGist}
                        disabled={syncStatus === 'loading'}
                        className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition text-xs text-gray-300 border border-slate-700"
                    >
                        <Upload size={16} className="mb-1 text-blue-400" />
                        Upload
                    </button>
                    <button 
                        onClick={handleDownloadFromGist}
                        disabled={syncStatus === 'loading'}
                        className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition text-xs text-gray-300 border border-slate-700"
                    >
                        <Download size={16} className="mb-1 text-green-400" />
                        Download
                    </button>
                </div>

                {syncStatus !== 'idle' && (
                    <div className={`mt-3 text-xs text-center flex items-center justify-center ${
                        syncStatus === 'error' ? 'text-red-400' : 'text-green-400'
                    }`}>
                        {syncStatus === 'loading' ? 'Processing...' : syncMessage}
                    </div>
                )}
                 
                 {syncConfig.lastSyncTime && syncStatus === 'idle' && (
                     <div className="mt-2 text-[10px] text-center text-gray-600">
                         Last: {syncConfig.lastSyncTime}
                     </div>
                 )}
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 lg:p-12 scroll-smooth">
            <div className="max-w-7xl mx-auto">
                <Routes>
                    <Route path="/" element={<AssetDashboard assets={assets} setAssets={setAssets} />} />
                    <Route path="/options" element={<OptionsJournal trades={trades} setTrades={setTrades} />} />
                    <Route path="/pnl" element={<MonthlyPnL trades={trades} manualEntries={manualPnL} setManualEntries={setManualPnL} />} />
                    <Route path="/airdrops" element={<AirdropTracker airdrops={airdrops} setAirdrops={setAirdrops} />} />
                </Routes>
            </div>
        </main>

      </div>
    </Router>
  );
};

export default App;
