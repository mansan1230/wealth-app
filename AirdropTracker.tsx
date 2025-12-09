
import React, { useState } from 'react';
import { AirdropProject, AirdropStatus } from '../types';
import { Plus, Trash2, ExternalLink, Twitter, CheckSquare, Pencil, X, Save } from 'lucide-react';

interface AirdropTrackerProps {
  airdrops: AirdropProject[];
  setAirdrops: React.Dispatch<React.SetStateAction<AirdropProject[]>>;
}

const STATUS_COLORS: Record<AirdropStatus, string> = {
  'New': 'bg-blue-500',
  'Farming': 'bg-yellow-500',
  'Waitlist': 'bg-purple-500',
  'Claimable': 'bg-green-500',
  'Finished': 'bg-gray-500'
};

const AirdropTracker: React.FC<AirdropTrackerProps> = ({ airdrops, setAirdrops }) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AirdropProject>>({
    status: 'New',
    priority: 'Medium',
    name: '',
    twitterUrl: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({ status: 'New', priority: 'Medium', name: '', twitterUrl: '', notes: '' });
    setIsEditing(null);
  };

  const handleEdit = (project: AirdropProject) => {
    setFormData(project);
    setIsEditing(project.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this airdrop project?')) {
      setAirdrops(airdrops.filter(a => a.id !== id));
      if (isEditing === id) resetForm();
    }
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (isEditing) {
      setAirdrops(airdrops.map(a => a.id === isEditing ? {
        ...a,
        name: formData.name!,
        twitterUrl: formData.twitterUrl,
        status: formData.status as AirdropStatus,
        notes: formData.notes,
        priority: formData.priority as any
      } : a));
    } else {
      const newProject: AirdropProject = {
        id: Date.now().toString(),
        name: formData.name,
        twitterUrl: formData.twitterUrl,
        status: formData.status as AirdropStatus,
        notes: formData.notes,
        priority: formData.priority as any
      };
      setAirdrops([newProject, ...airdrops]);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center">
             <CheckSquare className="mr-3 text-purple-500" /> 空投任務表 (Airdrops)
           </h2>
           <p className="text-gray-400 mt-1">追蹤需要交互、簽到或領取的空投項目。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl sticky top-6">
             <h3 className="text-lg font-semibold text-white mb-4">
               {isEditing ? '編輯項目' : '新增空投項目'}
             </h3>
             <div className="space-y-4">
                <div>
                   <label className="text-xs text-gray-500 uppercase font-semibold">項目名稱</label>
                   <input 
                      type="text" 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white mt-1 focus:border-purple-500 outline-none"
                      placeholder="e.g. LayerZero"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="text-xs text-gray-500 uppercase font-semibold">Twitter Link</label>
                   <div className="relative">
                     <Twitter className="absolute left-3 top-3.5 text-blue-400 w-4 h-4" />
                     <input 
                        type="text" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-10 text-white mt-1 focus:border-purple-500 outline-none"
                        placeholder="https://twitter.com/..."
                        value={formData.twitterUrl || ''}
                        onChange={e => setFormData({...formData, twitterUrl: e.target.value})}
                     />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs text-gray-500 uppercase font-semibold">狀態</label>
                       <select 
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white mt-1 outline-none"
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as AirdropStatus})}
                       >
                          {Object.keys(STATUS_COLORS).map(s => (
                              <option key={s} value={s}>{s}</option>
                          ))}
                       </select>
                    </div>
                    <div>
                       <label className="text-xs text-gray-500 uppercase font-semibold">優先級</label>
                       <select 
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white mt-1 outline-none"
                          value={formData.priority}
                          onChange={e => setFormData({...formData, priority: e.target.value as any})}
                       >
                          <option value="High">High 🔥</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                       </select>
                    </div>
                </div>
                <div>
                   <label className="text-xs text-gray-500 uppercase font-semibold">備註 / 任務 (Notes)</label>
                   <textarea 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white mt-1 h-24 focus:border-purple-500 outline-none resize-none"
                      placeholder="e.g. Daily check-in, bridge ETH..."
                      value={formData.notes || ''}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                   />
                </div>
                <div className="flex gap-2 pt-2">
                   {isEditing && (
                      <button onClick={resetForm} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg font-medium transition">
                        取消
                      </button>
                   )}
                   <button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg font-medium transition flex justify-center items-center">
                     <Save className="w-4 h-4 mr-2" /> {isEditing ? '更新' : '儲存'}
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
           <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-slate-950 text-gray-400 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-4">項目 / Twitter</th>
                          <th className="px-6 py-4">狀態</th>
                          <th className="px-6 py-4 w-1/3">備註</th>
                          <th className="px-6 py-4 text-center">操作</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                      {airdrops.map(airdrop => (
                          <tr key={airdrop.id} className="hover:bg-slate-800/50 transition group">
                              <td className="px-6 py-4">
                                  <div className="font-bold text-white text-base flex items-center">
                                     {airdrop.name}
                                     {airdrop.priority === 'High' && <span className="ml-2 text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50">🔥 HOT</span>}
                                  </div>
                                  {airdrop.twitterUrl && (
                                      <a 
                                        href={airdrop.twitterUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-400 text-sm flex items-center mt-1 hover:underline"
                                      >
                                          <Twitter size={12} className="mr-1" />
                                          Twitter
                                          <ExternalLink size={10} className="ml-1 opacity-70" />
                                      </a>
                                  )}
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[airdrop.status]}`}>
                                      {airdrop.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <p className="text-gray-400 text-sm whitespace-pre-wrap">{airdrop.notes || '-'}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEdit(airdrop)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-slate-800 rounded-full transition">
                                          <Pencil size={16} />
                                      </button>
                                      <button onClick={() => handleDelete(airdrop.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition">
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {airdrops.length === 0 && (
                          <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                  暫無空投項目，快去發掘！
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AirdropTracker;
