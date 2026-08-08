# Budget-Expense-Tracker
Tracks income, expenses, budget, plans on calendar, etc.

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'infinity-hub-mac';

let firebaseApp, auth, db;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config !== '{}'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
      };
  
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (e) {
  console.warn("Firebase initialization notice:", e);
}

// Firestore Document Path Helpers
const getPrivateDocRef = (userId, collectionName, docId) => {
  if (!db) return null;
  return doc(db, 'artifacts', appId, 'users', userId, collectionName, docId);
};

const formatToDateKey = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return formatToDateKey(new Date());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const tintColor = (hex, factor) => {
  if (!hex || hex.startsWith('url')) return '#cccccc';
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);
  r = Math.round(r * (1 - factor));
  g = Math.round(g * (1 - factor));
  b = Math.round(b * (1 - factor));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
};

const getWeekRange = (date, startsOnSunday) => {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const diff = start.getDate() - dayOfWeek + (startsOnSunday ? 0 : (dayOfWeek === 0 ? -6 : 1));
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getWeekDays = (startDate, startsOnSunday) => {
  const days = [];
  const start = new Date(startDate);
  const dayOfWeek = start.getDay();
  const diff = start.getDate() - dayOfWeek + (startsOnSunday ? 0 : (dayOfWeek === 0 ? -6 : 1));
  start.setDate(diff);
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
};

const DEFAULT_COLOR_SCHEME = {
  primary: '#4c9aff',
  secondary: '#34d399',
  customSchemes: [
    { primary: '#4c9aff', secondary: '#34d399' },
    { primary: '#fca34d', secondary: '#ef6262' },
    { primary: '#b475ff', secondary: '#fa72b6' },
    { primary: '#15b8d4', secondary: '#4dd668' },
  ]
};

const BG_PRESETS = [
  { id: 'none', name: 'Clean', url: '' },
  { id: 'grad1', name: 'Aurora', url: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'grad2', name: 'Ocean', url: 'linear-gradient(to top, #00c6fb 0%, #005bea 100%)' },
  { id: 'img1', name: 'Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80' },
  { id: 'img2', name: 'Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80' },
  { id: 'img3', name: 'Abstract', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80' },
];

const createNewSection = () => ({ id: crypto.randomUUID(), content: '' });

const CustomActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, stroke, strokeWidth, payload } = props;
  const isDonut = payload?.chartType === 'income';

  if (!Sector) return null;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={isDonut ? 'none' : fill}
        stroke={stroke || fill}
        strokeWidth={isDonut ? 10 : strokeWidth || 4}
      />
    </g>
  );
};

const PlannerSection = memo(({ section, updateDayContent, darkMode }) => {
  const textareaRef = useRef(null);
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, []);
  useEffect(() => adjustHeight(), [section.content, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={section.content}
      onChange={(e) => updateDayContent(section.id, e.target.value)}
      placeholder="Type plan..."
      className={`w-full backdrop-blur-md border-2 rounded-xl p-3 text-sm resize-none outline-none transition-all 
        ${darkMode ? 'text-white bg-white/5 border-white/10 focus:border-white/30' : 'text-gray-900 bg-white/40 border-black/10 focus:border-black/20'}`}
      rows={1}
    />
  );
});

const DailyPlannerCard = memo(({ date, dayData, savePlannerData, theme, darkMode }) => {
  const dateKey = formatToDateKey(date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const isToday = formatToDateKey(new Date()) === dateKey;

  const updateDay = useCallback((key, value) => {
    savePlannerData(dateKey, { ...dayData, [key]: value });
  }, [dateKey, dayData, savePlannerData]);

  const updateDayContent = useCallback((sectionId, content) => {
    const newSecs = dayData.sections.map(s => s.id === sectionId ? { ...s, content } : s);
    updateDay('sections', newSecs);
  }, [dayData.sections, updateDay]);

  const bgStyle = useMemo(() => {
    const preset = BG_PRESETS.find(p => p.id === dayData.bgPreset);
    if (!preset || preset.id === 'none') return {};
    if (preset.url.startsWith('linear')) return { background: preset.url };
    return { 
      backgroundImage: `linear-gradient(rgba(0,0,0,${darkMode ? 0.7 : 0.2}), rgba(0,0,0,${darkMode ? 0.7 : 0.2})), url(${preset.url})`,
      backgroundSize: 'cover', backgroundPosition: 'center'
    };
  }, [dayData.bgPreset, darkMode]);

  return (
    <div className={`rounded-2xl shadow-xl flex flex-col min-h-[480px] overflow-hidden border-t-8 border-x border-b ${darkMode ? 'border-white/10' : 'border-black/10 bg-white'}`} style={{ ...bgStyle, borderTopColor: dayData.customColor || theme.primary }}>
      <div className={`p-4 bg-black/5 backdrop-blur-sm ${dayData.bgPreset !== 'none' ? 'text-white' : theme.text}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-black">{dayName} {isToday && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full uppercase ml-2 tracking-tighter no-print">Today</span>}</h3>
            <p className="opacity-70 text-sm font-bold">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <div className="flex gap-2 no-print">
            <select value={dayData.bgPreset} onChange={(e) => updateDay('bgPreset', e.target.value)} className="text-[10px] bg-white/20 rounded font-black py-1">
              {BG_PRESETS.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
            </select>
            <input type="color" value={dayData.customColor || theme.primary} onChange={(e) => updateDay('customColor', e.target.value)} className="w-5 h-5 rounded-full border-none p-0 cursor-pointer" />
          </div>
        </div>
        <div className="mt-2">
          <label className="text-[9px] uppercase font-black opacity-50 block mb-1 tracking-widest">Calendar Preview</label>
          <input type="text" value={dayData.summary || ''} onChange={(e) => updateDay('summary', e.target.value)} className="w-full bg-white/10 border-2 rounded-lg px-3 py-2 text-xs font-black outline-none" />
        </div>
      </div>
      <div className="p-4 flex-grow space-y-4">
        {dayData.sections.map((section) => (
          <PlannerSection key={section.id} section={section} updateDayContent={updateDayContent} darkMode={darkMode} />
        ))}
        <button onClick={() => updateDay('sections', [...dayData.sections, createNewSection()])} className="w-full py-3 border-2 border-dashed rounded-2xl text-xs font-black text-gray-400 hover:text-blue-400 transition-colors uppercase tracking-widest no-print">+ New Section</button>
      </div>
    </div>
  );
});

const CalendarView = memo(({ focusDate, setFocusDate, setActiveTab, weekStartsOn, plannerCache, theme, darkMode }) => {
  const [viewDate, setViewDate] = useState(new Date(focusDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const grid = [];
  const padding = weekStartsOn === 'monday' ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay;
  for (let i = 0; i < padding; i++) grid.push(null);
  for (let i = 1; i <= daysInMonth; i++) grid.push(new Date(year, month, i));

  return (
    <div className={`p-4 sm:p-6 rounded-3xl ${theme.cardBg} shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300`}>
      <div className="flex justify-between items-center">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">{monthName} <span className="opacity-10">{year}</span></h2>
          <div className="flex gap-1 sm:gap-2 no-print">
              <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className={`p-2 rounded-lg ${theme.inputBg}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button>
              <button onClick={() => setViewDate(new Date())} className={`px-3 py-2 font-black text-[10px] uppercase rounded-lg ${theme.inputBg}`}>Today</button>
              <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className={`p-2 rounded-lg ${theme.inputBg}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {(weekStartsOn === 'monday' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(d => (
              <div key={d} className="text-center text-[9px] sm:text-[10px] font-black uppercase opacity-40 py-2">{d}</div>
          ))}
          {grid.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const key = formatToDateKey(day);
              const dayData = plannerCache[key];
              const summary = dayData?.summary;
              const hasNotes = dayData?.sections.some(s => s.content.trim().length > 0);
              const dayColor = dayData?.customColor;
              const isSelected = formatToDateKey(focusDate) === key;

              return (
                  <button
                      key={key}
                      onClick={() => { setFocusDate(day); setActiveTab('planner'); }}
                      className={`relative aspect-square rounded-xl sm:rounded-2xl p-1 flex flex-col items-center transition-all hover:scale-105 border-2 overflow-hidden 
                        ${isSelected ? 'border-blue-500 z-10 shadow-lg scale-105' : 'border-transparent'} ${theme.inputBg}`}
                  >
                      <span className={`text-xs sm:text-sm font-black mb-1 ${hasNotes ? 'text-blue-600' : ''}`}>{day.getDate()}</span>
                      {summary && <div className="w-full px-0.5"><p className="text-[6px] sm:text-[7px] leading-[1.1] font-black uppercase text-center break-words line-clamp-2" style={{ color: dayColor || '#3b82f6' }}>{summary}</p></div>}
                      {hasNotes && !summary && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mt-0.5" style={{ backgroundColor: dayColor || '#3b82f6' }} />}
                  </button>
              );
          })}
      </div>
    </div>
  );
});

const SideLegend = memo(({ data, colors, total, theme, isDonut = false }) => {
    if (!data || data.length === 0) return null;
    return (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto px-2 sm:px-4 py-2 border-l-2 border-black/5 w-28 sm:w-40 scrollbar-hide flex-shrink-0">
            {data.map((entry, index) => {
                const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                const color = colors[index % colors.length];
                return (
                    <div key={index} className="flex flex-col">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <div 
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0`} 
                                {% raw %}
                                style={{ backgroundColor: isDonut ? 'transparent' : color, border: isDonut ? `2px solid ${color}` : 'none' }} 
                                {% endraw %}
                            />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase opacity-60 truncate w-full">{entry.name}</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black ml-3 sm:ml-4" style={{ color }}>{percentage}%</span>
                    </div>
                );
            })}
        </div>
    );
});

const FinancialDashboard = memo(({ focusDate, budgetData, limitData, onSave, onSaveLimits, theme, darkMode, colorScheme, weekStartsOn }) => {
  const [scope, setScope] = useState('month'); 
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeIncomeIndex, setActiveIncomeIndex] = useState(-1);
  const [expandedRow, setExpandedRow] = useState(null);
  
  const lastAddedId = useRef(null);
  const lastAddedSubId = useRef(null);

  const rangeTitle = useMemo(() => {
      if (scope === 'year') return `Yearly Breakdown ${focusDate.getFullYear()}`;
      if (scope === 'month') return `Monthly: ${focusDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
      const { start, end } = getWeekRange(focusDate, weekStartsOn === 'sunday');
      return `Week: ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [scope, focusDate, weekStartsOn]);

  const filteredData = useMemo(() => {
    const year = focusDate.getFullYear();
    const month = focusDate.getMonth();
    const { start: weekStart, end: weekEnd } = getWeekRange(focusDate, weekStartsOn === 'sunday');

    return budgetData.filter(item => {
      const itemDate = new Date(item.date || focusDate);
      if (scope === 'year') return itemDate.getFullYear() === year;
      if (scope === 'month') return itemDate.getFullYear() === year && itemDate.getMonth() === month;
      return itemDate >= weekStart && itemDate <= weekEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [budgetData, focusDate, scope, weekStartsOn]);

  const stats = useMemo(() => {
    const incomeRecords = filteredData.filter(i => i.type === 'Income');
    const expenseRecords = filteredData.filter(i => i.type === 'Expense');
    const transferRecords = filteredData.filter(i => i.type === 'Transfer');
    const depositRecords = filteredData.filter(i => i.type === 'Deposit');
    const withdrawalRecords = filteredData.filter(i => i.type === 'Withdrawal');

    const totalIncome = incomeRecords.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExpense = expenseRecords.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    
    const expenseMap = expenseRecords.reduce((acc, i) => { 
        const cat = (i.category || 'General').trim();
        acc[cat] = (acc[cat] || 0) + (Number(i.amount) || 0); return acc; 
    }, {});
    
    const incomeMap = incomeRecords.reduce((acc, i) => { 
        const cat = (i.category || 'General').trim();
        acc[cat] = (acc[cat] || 0) + (Number(i.amount) || 0); return acc; 
    }, {});
    
    const expensePie = Object.entries(expenseMap).map(([name, value]) => ({ 
        name, value: Number(value), chartType: 'expense'
    })).sort((a,b) => b.value - a.value);

    const incomePie = Object.entries(incomeMap).map(([name, value]) => ({ 
        name, value: Number(value), chartType: 'income'
    })).sort((a,b) => b.value - a.value);

    const mapInternal = (recs) => recs.reduce((acc, i) => {
        const cat = (i.category || 'Other').trim();
        acc[cat] = (acc[cat] || 0) + Math.abs(Number(i.amount) || 0);
        return acc;
    }, {});

    const transferInChart = Object.entries(mapInternal(transferRecords.filter(i => (Number(i.amount) || 0) > 0))).map(([name, value]) => ({ name, value }));
    const transferOutChart = Object.entries(mapInternal(transferRecords.filter(i => (Number(i.amount) || 0) < 0))).map(([name, value]) => ({ name, value }));
    const depositChart = Object.entries(mapInternal(depositRecords)).map(([name, value]) => ({ name, value }));
    const withdrawalChart = Object.entries(mapInternal(withdrawalRecords)).map(([name, value]) => ({ name, value }));

    const totalTransferIn = transferRecords.filter(i => (Number(i.amount) || 0) > 0).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalTransferOut = transferRecords.filter(i => (Number(i.amount) || 0) < 0).reduce((s, i) => s + Math.abs(Number(i.amount) || 0), 0);
    const totalDeposit = depositRecords.reduce((s, i) => s + Math.abs(Number(i.amount) || 0), 0);
    const totalWithdrawal = withdrawalRecords.reduce((s, i) => s + Math.abs(Number(i.amount) || 0), 0);

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, expensePie, incomePie, transferInChart, transferOutChart, depositChart, withdrawalChart, totalTransferIn, totalTransferOut, totalDeposit, totalWithdrawal };
  }, [filteredData]);

  const handleInputFocus = (e) => {
    const el = e.target;
    setTimeout(() => {
        if (el) el.select();
    }, 20);
  };

  const updateItem = (id, key, val) => {
    const newData = budgetData.map(item => {
        if (item.id === id) {
            let updated = { ...item, [key]: val };
            if (key === 'subItems') {
                updated.amount = val.reduce((s, i) => s + (Number(i.amount) || 0), 0);
            }
            return updated;
        }
        return item;
    });
    onSave(newData);
  };

  const addNewEntry = () => {
    const newId = crypto.randomUUID();
    lastAddedId.current = newId;
    onSave([...budgetData, { id: newId, category: '', subItems: [], amount: 0, type: 'Expense', date: formatToDateKey(focusDate) }]);
  };

  const addSubItem = (parentId) => {
    const subId = crypto.randomUUID();
    lastAddedSubId.current = subId;
    const parent = budgetData.find(i => i.id === parentId);
    const newSubs = [...(parent.subItems || []), { id: subId, name: '', amount: 0 }];
    updateItem(parentId, 'subItems', newSubs);
  };

  useEffect(() => {
    if (lastAddedId.current) {
        const el = document.getElementById(`input-group-${lastAddedId.current}`);
        if (el) el.focus();
        lastAddedId.current = null;
    }
  }, [budgetData.length]);

  useEffect(() => {
    if (lastAddedSubId.current) {
        const el = document.getElementById(`sub-input-name-${lastAddedSubId.current}`);
        if (el) el.focus();
        lastAddedSubId.current = null;
    }
  }, [budgetData]);

  const addLimit = () => {
    const { start, end } = getWeekRange(focusDate, weekStartsOn === 'sunday');
    onSaveLimits([...limitData, { 
        id: crypto.randomUUID(), category: 'New Threshold', amount: 100, 
        startDate: formatToDateKey(start), endDate: formatToDateKey(end)
    }]);
  };

  const PIE_COLORS = colorScheme.customSchemes.map(s => s.primary);
  const INCOME_COLORS = colorScheme.customSchemes.map(s => s.secondary);
  const T_COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#93c5fd', '#bfdbfe'];
  const D_COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#b475ff', '#78350f']; 
  const W_COLORS = ['#ec4899', '#db2777', '#be185d', '#9d174d', '#831843']; 

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div><h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Financial Hub</h2><p className="text-[10px] font-black opacity-40 mt-1 uppercase tracking-widest">{rangeTitle}</p></div>
        <div className={`flex p-1 rounded-2xl ${theme.inputBg}`}>
          {['week', 'month', 'year'].map(s => (
            <button key={s} onClick={() => setScope(s)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${scope === s ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-emerald-500 text-white shadow-lg"><p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Gross Income</p><p className="text-2xl font-black">${stats.totalIncome.toLocaleString()}</p></div>
        <div className="p-6 rounded-3xl bg-blue-600 text-white shadow-lg"><p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Gross Expenses</p><p className="text-2xl font-black">${stats.totalExpense.toLocaleString()}</p></div>
        <div className={`p-6 rounded-3xl shadow-lg ${stats.balance >= 0 ? 'bg-gray-900' : 'bg-red-500'} text-white`}><p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Net Flow</p><p className="text-2xl font-black">${stats.balance.toLocaleString()}</p></div>
        <div className={`${theme.cardBg} p-6 rounded-3xl shadow-lg border-2 ${theme.border}`}><p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Savings Delta</p><p className="text-2xl font-black">${(stats.totalIncome - stats.totalExpense).toFixed(2)}</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`${theme.cardBg} px-2 sm:px-6 py-6 rounded-[40px] border-2 ${theme.border} shadow-lg h-[480px] flex flex-col overflow-hidden`}>
          <h3 className="text-xl font-black mb-4 uppercase tracking-tighter text-blue-600 px-2 sm:px-4">Expense Mix</h3>
          <div className="flex flex-1 min-h-0 w-full">
            <div className="flex-1 min-w-0">
                {ResponsiveContainer && PieChart && Pie && (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ left: -10, right: -10 }}>
                          <Pie data={stats.expensePie} innerRadius={60} outerRadius={90} paddingAngle={6} dataKey="value" activeIndex={activeIndex} activeShape={CustomActiveShape} onMouseEnter={(_, i) => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(-1)} isAnimationActive={true} animationDuration={1500}>
                              {stats.expensePie.map((entry, index) => (<Cell key={`cell-exp-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={2} />))}
                          </Pie>
                          <Tooltip content={({ active, payload }) => active && payload?.[0] ? (<div className={`${theme.cardBg} p-3 rounded-xl border-4 shadow-2xl font-black text-sm`} style={{ borderColor: payload[0].color }}><p className="text-blue-600 text-lg">${payload[0].value.toFixed(2)}</p></div>) : null} wrapperStyle={{ zIndex: 100 }} />
                      </PieChart>
                  </ResponsiveContainer>
                )}
            </div>
            <SideLegend data={stats.expensePie} colors={PIE_COLORS} total={stats.totalExpense} theme={theme} />
          </div>
        </div>

        <div className={`${theme.cardBg} px-2 sm:px-6 py-6 rounded-[40px] border-2 ${theme.border} shadow-lg h-[480px] flex flex-col overflow-hidden`}>
          <h3 className="text-xl font-black mb-4 uppercase tracking-tighter text-emerald-600 px-2 sm:px-4">Income Streams</h3>
          <div className="flex flex-1 min-h-0 w-full">
            <div className="flex-1 min-w-0">
                {ResponsiveContainer && PieChart && Pie && (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ left: -10, right: -10 }}>
                          <Pie data={stats.incomePie} innerRadius={80} outerRadius={95} paddingAngle={8} dataKey="value" activeIndex={activeIncomeIndex} activeShape={CustomActiveShape} onMouseEnter={(_, i) => setActiveIncomeIndex(i)} onMouseLeave={() => setActiveIncomeIndex(-1)} isAnimationActive={true} animationDuration={1500}>
                              {stats.incomePie.map((entry, index) => (<Cell key={`cell-inc-${index}`} fill="none" stroke={INCOME_COLORS[index % INCOME_COLORS.length]} strokeWidth={8} />))}
                          </Pie>
                          <Tooltip content={({ active, payload }) => active && payload?.[0] ? (<div className={`${theme.cardBg} p-3 rounded-xl border-4 shadow-2xl font-black text-sm`} style={{ borderColor: payload[0].stroke }}><p className="text-emerald-600 text-lg">${payload[0].value.toFixed(2)}</p></div>) : null} wrapperStyle={{ zIndex: 100 }} />
                      </PieChart>
                  </ResponsiveContainer>
                )}
            </div>
            <SideLegend data={stats.incomePie} colors={INCOME_COLORS} total={stats.totalIncome} theme={theme} isDonut={true} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 h-[480px]">
             <div className={`${theme.cardBg} p-3 rounded-[32px] border-2 ${theme.border} shadow flex flex-col items-center justify-center overflow-hidden relative`}>
                <h4 className="text-[8px] font-black uppercase opacity-40 absolute top-2 text-center w-full">Transfer Away</h4>
                <ResponsiveContainer width="100%" height="70%">
                    <PieChart><Pie data={stats.transferOutChart} innerRadius={25} outerRadius={35} dataKey="value" strokeWidth={0}>{stats.transferOutChart.map((e,i) => <Cell key={i} fill={T_COLORS[i % 5]} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <p className="text-[10px] font-black mt-1">${stats.totalTransferOut.toFixed(0)}</p>
             </div>
             <div className={`${theme.cardBg} p-3 rounded-[32px] border-2 ${theme.border} shadow flex flex-col items-center justify-center overflow-hidden relative`}>
                <h4 className="text-[8px] font-black uppercase opacity-40 absolute top-2 text-center w-full">Transfer In</h4>
                <ResponsiveContainer width="100%" height="70%">
                    <PieChart><Pie data={stats.transferInChart} innerRadius={25} outerRadius={35} dataKey="value" strokeWidth={0}>{stats.transferInChart.map((e,i) => <Cell key={i} fill={T_COLORS[i % 5]} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <p className="text-[10px] font-black mt-1">${stats.totalTransferIn.toFixed(0)}</p>
             </div>
             <div className={`${theme.cardBg} p-3 rounded-[32px] border-2 ${theme.border} shadow flex flex-col items-center justify-center overflow-hidden relative`}>
                <h4 className="text-[8px] font-black uppercase opacity-40 absolute top-2 text-center w-full">Deposits</h4>
                <ResponsiveContainer width="100%" height="70%">
                    <PieChart>
                        <Pie data={stats.depositChart} innerRadius={22} outerRadius={32} paddingAngle={10} dataKey="value" strokeWidth={2} stroke={theme.cardBg}>
                            {stats.depositChart.map((e,i) => <Cell key={i} fill={D_COLORS[i % 5]} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <p className="text-[10px] font-black mt-1">${stats.totalDeposit.toFixed(0)}</p>
             </div>
             <div className={`${theme.cardBg} p-3 rounded-[32px] border-2 ${theme.border} shadow flex flex-col items-center justify-center overflow-hidden relative`}>
                <h4 className="text-[8px] font-black uppercase opacity-40 absolute top-2 text-center w-full">Withdrawals</h4>
                <ResponsiveContainer width="100%" height="70%">
                    <PieChart>
                        <Pie data={stats.withdrawalChart} innerRadius={28} outerRadius={32} dataKey="value" strokeWidth={2} strokeDasharray="3 3">
                            {stats.withdrawalChart.map((e,i) => <Cell key={i} fill="none" stroke={W_COLORS[i % 5]} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <p className="text-[10px] font-black mt-1 text-pink-600">${stats.totalWithdrawal.toFixed(0)}</p>
             </div>
        </div>
      </div>

      <div className={`${theme.cardBg} p-4 sm:p-8 rounded-[40px] border-2 ${theme.border} space-y-8`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <div><h3 className="text-xl font-black uppercase tracking-tighter">Threshold Monitors</h3><p className="text-[10px] font-bold opacity-30 uppercase tracking-widest tracking-tighter">Tracks individual sub-item amounts</p></div>
            <button onClick={addLimit} className="w-full sm:w-auto text-xs font-black text-blue-600 border-2 border-blue-600 px-4 py-2 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-md uppercase">+ New Monitor</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {limitData.map(limit => {
                const limitName = limit.category.trim().toLowerCase();
                const actual = budgetData.filter(i => i.type === 'Expense' && i.date >= limit.startDate && i.date <= limit.endDate).reduce((sum, trans) => {
                    const isMainCat = (trans.category || '').toLowerCase().trim() === limitName;
                    const subItemSum = (trans.subItems || []).filter(sub => (sub.name || '').toLowerCase().trim() === limitName).reduce((s, si) => s + (Number(si.amount) || 0), 0);
                    return sum + (isMainCat ? (Number(trans.amount) || 0) : subItemSum);
                }, 0);
                const progress = limit.amount > 0 ? (actual / limit.amount) * 100 : 0;
                const exceeded = actual > limit.amount;
                const labelLeft = Math.min(progress, 100) / 2;

                return (
                    <div key={limit.id} className="space-y-3 bg-black/5 p-5 rounded-3xl group break-inside-avoid">
                        <div className="flex justify-between items-center">
                            <input className="bg-transparent font-black text-lg outline-none w-full" value={limit.category} onChange={e => onSaveLimits(limitData.map(l => l.id === limit.id ? {...l, category: e.target.value} : l))} />
                            <button onClick={() => onSaveLimits(limitData.filter(l => l.id !== limit.id))} className="text-red-500 opacity-0 group-hover:opacity-100 p-1 hover:scale-110 no-print"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="h-8 w-full rounded-2xl border-2 border-slate-300 relative bg-slate-100 overflow-hidden flex">
                             <div className="h-full bg-slate-500 transition-all duration-1000 shadow-lg" style={{ width: `${Math.min(progress, 100)}%` }} />
                             {exceeded && <div className="h-full bg-red-600 transition-all duration-1000 shadow-lg" style={{ width: `${Math.max(0, progress - 100)}%` }} />}
                             <span className="absolute top-1/2 -translate-y-1/2 font-black text-[10px] text-white drop-shadow-md" style={{ left: `${labelLeft}%`, transform: `translate(-50%, -50%)` }}>${actual.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase">
                            <span>Limit: $<input type="number" onFocus={handleInputFocus} className="bg-transparent w-16 no-print font-black outline-none" value={limit.amount} onChange={e => onSaveLimits(limitData.map(l => l.id === limit.id ? {...l, amount: parseFloat(e.target.value) || 0} : l))} /><span className="print-only">{limit.amount}</span></span>
                            <span className={exceeded ? 'text-red-600 animate-pulse' : 'text-blue-600'}>{exceeded ? 'Over Limit' : 'Tracking'}</span>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      <div className={`${theme.cardBg} p-4 sm:p-6 rounded-[40px] border-2 ${theme.border} shadow-xl overflow-hidden`}>
        <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-lg font-black uppercase">Ledger</h3>
            <button onClick={addNewEntry} className="px-5 py-2 bg-blue-600 text-white rounded-2xl text-[10px] font-black shadow-lg uppercase no-print">+ New Entry</button>
        </div>
        <div className="overflow-x-auto px-2">
          <table className="w-full text-left min-w-[750px]">
            <thead>
              <tr className="text-[10px] font-black uppercase opacity-30 border-b-2 border-black/5">
                <th className="p-4">Group</th><th className="p-4">Total ($)</th><th className="p-4">Details</th><th className="p-4">Type</th><th className="p-4">Date</th><th className="p-4 text-right no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredData.map(item => (
                <React.Fragment key={item.id}>
                    <tr className="hover:bg-black/5 transition-colors group">
                    <td className="p-4"><input id={`input-group-${item.id}`} className="bg-transparent font-black outline-none w-full border-b-2 border-transparent focus:border-blue-600" value={item.category || ''} placeholder="Ex: Food" onChange={e => updateItem(item.id, 'category', e.target.value)} /></td>
                    <td className="p-4 font-black text-blue-600">
                        <div className="flex items-center gap-1">$<input type="number" onFocus={handleInputFocus} className="bg-transparent outline-none w-20 font-black" value={item.amount || 0} onChange={e => updateItem(item.id, 'amount', Number(e.target.value))} disabled={(item.subItems || []).length > 0} /></div>
                        {(item.subItems || []).length > 0 && <p className="text-[8px] uppercase opacity-40 font-bold leading-none mt-1">Sum of Items</p>}
                    </td>
                    <td className="p-4">
                        <button onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${expandedRow === item.id ? 'bg-blue-600 text-white' : 'bg-black/5'} no-print`}>
                            {expandedRow === item.id ? 'Close' : 'Breakdown'} ({(item.subItems || []).length})
                        </button>
                        <span className="print-only">{(item.subItems || []).map(s => `${s.name}: $${s.amount}`).join(', ')}</span>
                    </td>
                    <td className="p-4"><select className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer p-1 rounded-lg border-2 border-black/5" value={item.type} onChange={e => updateItem(item.id, 'type', e.target.value)}><option value="Expense">Expense</option><option value="Income">Income</option><option value="Transfer">Transfer</option><option value="Deposit">Deposit</option><option value="Withdrawal">Withdrawal</option></select></td>
                    <td className="p-4"><input type="date" value={item.date || formatToDateKey(focusDate)} onChange={(e) => updateItem(item.id, 'date', e.target.value)} className="bg-transparent font-black text-[10px] uppercase outline-none" /></td>
                    <td className="p-4 text-right no-print"><button onClick={() => onSave(budgetData.filter(i => i.id !== item.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-125"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                    </tr>
                    {expandedRow === item.id && (
                        <tr className="bg-blue-50/30 no-print">
                            <td colSpan="6" className="p-4">
                                <div className="space-y-3 pl-8">
                                    {(item.subItems || []).map((sub, idx) => (
                                        <div key={sub.id || idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                                            <input id={`sub-input-name-${sub.id}`} className="bg-white px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-black/5 outline-none focus:border-blue-600" value={sub.name} placeholder="Item Name" onChange={e => { const newSubs = [...(item.subItems || [])]; newSubs[idx].name = e.target.value; updateItem(item.id, 'subItems', newSubs); }} />
                                            <div className="flex items-center gap-1 font-black text-xs">$<input type="number" onFocus={handleInputFocus} className="bg-white px-3 py-1.5 rounded-xl w-24 border-2 border-black/5 outline-none focus:border-blue-600 font-black" value={sub.amount} onChange={e => { const newSubs = [...(item.subItems || [])]; newSubs[idx].amount = Number(e.target.value); updateItem(item.id, 'subItems', newSubs); }} /></div>
                                            <button onClick={() => { const newSubs = (item.subItems || []).filter((_, i) => i !== idx); updateItem(item.id, 'subItems', newSubs); }} className="text-red-500 hover:scale-110 transition-transform"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    ))}
                                    <button onClick={() => addSubItem(item.id)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">+ Add Sub-Category Item</button>
                                </div>
                            </td>
                        </tr>
                    )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

const App = () => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [activeTab, setActiveTab] = useState('planner');
  const [focusDate, setFocusDate] = useState(new Date());
  const [weekStartsOn, setWeekStartsOn] = useState('monday');

  const [plannerCache, setPlannerCache] = useState({});
  const [budgetData, setBudgetData] = useState([]);
  const [limitData, setLimitData] = useState([]);
  const [colorScheme, setColorScheme] = useState(DEFAULT_COLOR_SCHEME);
  const [darkMode, setDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const theme = useMemo(() => {
    const primary = colorScheme?.primary || DEFAULT_COLOR_SCHEME.primary;
    const secondary = colorScheme?.secondary || DEFAULT_COLOR_SCHEME.secondary;
    return {
      primary: darkMode ? tintColor(primary, 0.4) : primary,
      secondary: darkMode ? tintColor(secondary, 0.4) : secondary,
      bg: darkMode ? 'bg-gray-950' : 'bg-gray-100',
      cardBg: darkMode ? 'bg-gray-900' : 'bg-white',
      text: darkMode ? 'text-gray-100' : 'text-gray-900',
      secondaryText: darkMode ? 'text-gray-400' : 'text-gray-500',
      border: darkMode ? 'border-gray-800' : 'border-black/5',
      inputBg: darkMode ? 'bg-gray-800' : 'bg-gray-200', 
    };
  }, [colorScheme, darkMode]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof initialAuthToken !== 'undefined' && initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth Failure:", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) return;
    const userId = user.uid;
    const currentYearKey = `${focusDate.getFullYear()}`;
    
    const unsubBudget = onSnapshot(getPrivateDocRef(userId, 'yearly_finances', currentYearKey), (snap) => {
      if (snap.exists()) setBudgetData(JSON.parse(snap.data().data));
    }, (err) => console.error("Firestore Error:", err));

    const unsubLimits = onSnapshot(getPrivateDocRef(userId, 'budget_limits', currentYearKey), (snap) => {
        if (snap.exists()) setLimitData(JSON.parse(snap.data().data));
    }, (err) => console.error("Firestore Error:", err));

    const unsubTheme = onSnapshot(getPrivateDocRef(userId, 'settings', 'theme'), (snap) => {
      if (snap.exists()) {
        const data = JSON.parse(snap.data().data);
        setColorScheme(data.colorScheme);
        setDarkMode(data.darkMode);
        setWeekStartsOn(data.weekStartsOn || 'monday');
      }
    }, (err) => console.error("Firestore Error:", err));

    const currentMonthKey = `${focusDate.getFullYear()}-${focusDate.getMonth() + 1}`;
    const unsubPlanner = onSnapshot(getPrivateDocRef(userId, 'planner_buckets', currentMonthKey), (snap) => {
      if (snap.exists()) setPlannerCache(prev => ({ ...prev, ...JSON.parse(snap.data().data) }));
    }, (err) => console.error("Firestore Error:", err));

    return () => { unsubBudget(); unsubTheme(); unsubPlanner(); unsubLimits(); };
  }, [user, isAuthReady, focusDate]);

  const savePlannerData = useCallback(async (dateKey, updatedDay) => {
    if (!user) return;
    setIsSaving(true);
    setPlannerCache(prev => ({ ...prev, [dateKey]: updatedDay }));
    const currentMonthKey = `${focusDate.getFullYear()}-${focusDate.getMonth() + 1}`;
    const fullData = { ...plannerCache, [dateKey]: updatedDay };
    const monthData = {};
    Object.keys(fullData).forEach(k => {
      if (k.startsWith(`${focusDate.getFullYear()}-${String(focusDate.getMonth() + 1).padStart(2, '0')}`)) {
        monthData[k] = fullData[k];
      }
    });
    await setDoc(getPrivateDocRef(user.uid, 'planner_buckets', currentMonthKey), { data: JSON.stringify(monthData) });
    setTimeout(() => setIsSaving(false), 500);
  }, [user, plannerCache, focusDate]);

  const saveBudget = useCallback(async (data) => {
    if (!user) return;
    setBudgetData(data);
    const currentYearKey = `${focusDate.getFullYear()}`;
    await setDoc(getPrivateDocRef(user.uid, 'yearly_finances', currentYearKey), { data: JSON.stringify(data) });
  }, [user, focusDate]);

  const saveLimits = useCallback(async (data) => {
    if (!user) return;
    setLimitData(data);
    const currentYearKey = `${focusDate.getFullYear()}`;
    await setDoc(getPrivateDocRef(user.uid, 'budget_limits', currentYearKey), { data: JSON.stringify(data) });
  }, [user, focusDate]);

  const saveSettings = useCallback(async (newScheme, newDark, newWeekStart) => {
    if (!user) return;
    await setDoc(getPrivateDocRef(user.uid, 'settings', 'theme'), { 
        data: JSON.stringify({ colorScheme: newScheme, darkMode: newDark, weekStartsOn: newWeekStart }) 
    });
  }, [user]);

  const currentWeekDays = useMemo(() => getWeekDays(focusDate, weekStartsOn === 'sunday'), [focusDate, weekStartsOn]);

  const handlePrint = () => {
    window.print();
  };

  if (!isAuthReady) return <div className="min-h-screen flex items-center justify-center font-black bg-gray-100 text-blue-600 uppercase tracking-widest animate-pulse text-center p-4">Syncing Infinity Control System...</div>;

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-500 p-3 sm:p-4 md:p-8 font-sans selection:bg-blue-600 selection:text-white`}>
      <style>{`
        @media print {
            body { background: white !important; color: black !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            aside { display: none !important; }
            main { width: 100% !important; grid-column: span 12 / span 12 !important; }
            .grid { display: block !important; }
            .rounded-2xl, .rounded-3xl, .rounded-[40px] { border-radius: 0 !important; border: 1px solid #ddd !important; box-shadow: none !important; margin-bottom: 20px !important; break-inside: avoid; }
            .h-[480px], .h-[450px] { height: auto !important; min-height: 0 !important; }
            .overflow-hidden { overflow: visible !important; }
            input, select, textarea { border: none !important; background: transparent !important; color: black !important; }
            .recharts-responsive-container { min-height: 300px !important; height: 300px !important; visibility: visible !important; display: block !important; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <aside className="lg:col-span-3 space-y-6 no-print">
          <div className={`${theme.cardBg} p-6 rounded-[32px] shadow-xl space-y-6 border-2 ${theme.border}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl">P</div>
              <h1 className="text-2xl font-black tracking-tight uppercase leading-none text-blue-600">Infinity</h1>
            </div>
            <nav className="space-y-2">
                {[
                    { id: 'planner', label: 'Planner', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { id: 'calendar', label: 'Calendar', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                    { id: 'budget', label: 'Finances', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'shared', label: 'Shared', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-xs transition-all duration-300 ${activeTab === t.id ? 'bg-blue-600 text-white shadow-xl translate-x-2' : `hover:bg-black/5`}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={t.icon} /></svg>
                        {t.label}
                    </button>
                ))}
            </nav>
          </div>
          <div className={`${theme.cardBg} p-6 rounded-[32px] shadow-xl space-y-4 border-2 ${theme.border}`}>
             <h3 className="font-black uppercase text-[10px] opacity-30 tracking-widest tracking-tighter">Configuration</h3>
             <div className="flex justify-between items-center"><span className="text-xs font-black uppercase">Dark Mode</span><button onClick={() => { setDarkMode(!darkMode); saveSettings(colorScheme, !darkMode, weekStartsOn); }} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${darkMode ? 'left-7' : 'left-1'}`} /></button></div>
             <div className="flex justify-between items-center"><span className="text-xs font-black uppercase">Start Day</span><select value={weekStartsOn} onChange={(e) => { setWeekStartsOn(e.target.value); saveSettings(colorScheme, darkMode, e.target.value); }} className={`text-[10px] p-1 rounded font-black outline-none ${theme.inputBg} uppercase`}><option value="monday">Mon</option><option value="sunday">Sun</option></select></div>
          </div>
        </aside>

        <main className="lg:col-span-9 space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => { const d = new Date(focusDate); d.setMonth(d.getMonth() - 1); setFocusDate(d); }} className={`p-3 rounded-2xl ${theme.cardBg} border-2 ${theme.border} shadow-md hover:scale-110 active:scale-95 transition-all no-print`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg></button>
                    <h2 className="text-2xl font-black tracking-tighter uppercase">{focusDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => { const d = new Date(focusDate); d.setMonth(d.getMonth() + 1); setFocusDate(d); }} className={`p-3 rounded-2xl ${theme.cardBg} border-2 ${theme.border} shadow-md hover:scale-110 active:scale-95 transition-all no-print`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="px-5 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black shadow-lg hover:bg-black transition-all uppercase tracking-widest no-print flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Export PDF
                    </button>
                    {isSaving && <span className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-widest no-print">Syncing Hub...</span>}
                </div>
            </div>

            {activeTab === 'planner' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min items-start">
                    {currentWeekDays.map(day => (
                      <DailyPlannerCard key={formatToDateKey(day)} date={day} dayData={plannerCache[formatToDateKey(day)] || { sections: [createNewSection()], customColor: theme.primary, bgPreset: 'none', summary: '' }} savePlannerData={savePlannerData} theme={theme} darkMode={darkMode} />
                    ))}
                </div>
            )}

            {activeTab === 'calendar' && (
              <CalendarView focusDate={focusDate} setFocusDate={setFocusDate} setActiveTab={setActiveTab} weekStartsOn={weekStartsOn} plannerCache={plannerCache} theme={theme} darkMode={darkMode} />
            )}

            {(activeTab === 'budget' || activeTab === 'shared') && (
                <FinancialDashboard 
                    focusDate={focusDate} 
                    budgetData={budgetData} 
                    limitData={limitData} 
                    onSave={saveBudget} 
                    onSaveLimits={saveLimits} 
                    userId={user?.uid} 
                    theme={theme} 
                    darkMode={darkMode} 
                    colorScheme={colorScheme} 
                    weekStartsOn={weekStartsOn} 
                />
            )}
        </main>
      </div>
    </div>
  );
};

export default App;
