import { useState, useEffect } from 'react';
import { api, type KeywordConfig } from '../api';
import { Save, Plus, Trash2, Search } from 'lucide-react';

export const KeywordManager = () => {
    const [keywords, setKeywords] = useState<KeywordConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [newLimit, setNewLimit] = useState(50);

    useEffect(() => {
        loadKeywords();
    }, []);

    const loadKeywords = async () => {
        try {
            const kws = await api.getKeywords();
            setKeywords(kws);
        } catch (e) {
            console.error('Failed to load keywords:', e);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.updateKeywords(keywords);
        } catch (e) {
            console.error('Failed to save keywords:', e);
        }
        setLoading(false);
    };

    const handleAddKeyword = () => {
        if (!newKeyword.trim()) return;
        const updated = [...keywords, { keyword: newKeyword.trim(), limit: newLimit }];
        setKeywords(updated);
        setNewKeyword('');
        setNewLimit(50);
    };

    const handleDeleteKeyword = (index: number) => {
        const updated = keywords.filter((_, i) => i !== index);
        setKeywords(updated);
    };

    const handleLimitChange = (index: number, limit: number) => {
        const updated = [...keywords];
        updated[index] = { ...updated[index], limit: Math.max(1, limit) };
        setKeywords(updated);
    };

    const handleKeywordChange = (index: number, keyword: string) => {
        const updated = [...keywords];
        updated[index] = { ...updated[index], keyword };
        setKeywords(updated);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Search size={18} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Keywords</h2>
                            <p className="text-xs text-gray-500">{keywords.length} configured</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                    >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Keywords Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Keyword</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Limit</th>
                            <th className="px-4 py-3 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {keywords.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-5 py-12 text-center text-gray-400">
                                    <p className="text-sm">No keywords configured</p>
                                    <p className="text-xs mt-1">Add your first keyword below</p>
                                </td>
                            </tr>
                        ) : (
                            keywords.map((kw, index) => (
                                <tr key={index} className="group hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-5 py-2.5">
                                        <input
                                            type="text"
                                            value={kw.keyword}
                                            onChange={(e) => handleKeywordChange(index, e.target.value)}
                                            className="w-full px-3 py-2 bg-transparent border border-transparent rounded-lg text-sm text-gray-700 hover:border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <input
                                            type="number"
                                            value={kw.limit}
                                            onChange={(e) => handleLimitChange(index, parseInt(e.target.value) || 1)}
                                            min={1}
                                            className="w-full px-3 py-2 bg-transparent border border-transparent rounded-lg text-sm text-center text-gray-700 hover:border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all font-mono"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <button
                                            onClick={() => handleDeleteKeyword(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete keyword"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add New Keyword */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Add new keyword..."
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all placeholder:text-gray-400"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    />
                    <input
                        type="number"
                        value={newLimit}
                        onChange={(e) => setNewLimit(parseInt(e.target.value) || 50)}
                        min={1}
                        className="w-20 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-center font-mono focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                    />
                    <button
                        onClick={handleAddKeyword}
                        disabled={!newKeyword.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};
