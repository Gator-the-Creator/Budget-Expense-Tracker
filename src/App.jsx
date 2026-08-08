import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d8'];

export default function App() {
  const [expenses, setExpenses] = useState([
    { id: 1, category: 'Food', amount: 45.50, date: '2024-08-01', description: 'Grocery shopping' },
    { id: 2, category: 'Transport', amount: 15.00, date: '2024-08-02', description: 'Gas' },
    { id: 3, category: 'Entertainment', amount: 30.00, date: '2024-08-03', description: 'Movie tickets' },
  ]);
  const [activeTab, setActiveTab] = useState('finances');
  const [formData, setFormData] = useState({ category: 'Food', amount: '', date: '', description: '' });

  const addExpense = () => {
    if (formData.amount && formData.date) {
      setExpenses([...expenses, {
        id: Date.now(),
        ...formData,
        amount: parseFloat(formData.amount)
      }]);
      setFormData({ category: 'Food', amount: '', date: '', description: '' });
    }
  };

  const deleteExpense = (id) => setExpenses(expenses.filter(e => e.id !== id));

  const categoryTotals = expenses.reduce((acc, e) => {
    const existing = acc.find(item => item.name === e.category);
    if (existing) existing.value += e.amount;
    else acc.push({ name: e.category, value: e.amount });
    return acc;
  }, []);

  const monthlyData = expenses.reduce((acc, e) => {
    const month = new Date(e.date).toLocaleString('default', { month: 'short' });
    const existing = acc.find(item => item.month === month);
    if (existing) existing.total += e.amount;
    else acc.push({ month, total: e.amount });
    return acc;
  }, []);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgExpense = expenses.length > 0 ? (totalSpent / expenses.length).toFixed(2) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Budget & Expense Tracker</h1>
        <p className="text-gray-600 mb-8">Manage your finances with ease</p>

        <div className="flex gap-4 mb-8 border-b">
          {['finances', 'planner', 'calendar'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'finances' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4">Add Expense</h2>
                <div className="grid grid-cols-2 gap-4">
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="border rounded px-3 py-2">
                    {['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Other'].map(cat => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="border rounded px-3 py-2" />
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="border rounded px-3 py-2" />
                  <input type="text" placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="border rounded px-3 py-2" />
                </div>
                <button onClick={addExpense} className="mt-4 w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700">Add Expense</button>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Recent Expenses</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold">{exp.category}</p>
                        <p className="text-sm text-gray-600">{exp.description} - {exp.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">${exp.amount.toFixed(2)}</p>
                        <button onClick={() => deleteExpense(exp.id)} className="text-red-500 text-sm hover:text-red-700">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Stats</h3>
                <p className="text-gray-700 mb-2">Total Spent: <span className="font-bold text-indigo-600">${totalSpent.toFixed(2)}</span></p>
                <p className="text-gray-700">Avg Expense: <span className="font-bold text-indigo-600">${avgExpense}</span></p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">By Category</h3>
                {categoryTotals.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={categoryTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {categoryTotals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500">No data yet</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Budget Planner</h2>
            <p className="text-gray-600">Plan your monthly budget and track progress</p>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#8884d8" name="Spending" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500">No data yet</p>}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Calendar View</h2>
            <p className="text-gray-600">Track expenses by date</p>
            <div className="mt-4 space-y-2">
              {expenses.map(exp => (
                <div key={exp.id} className="p-3 bg-indigo-50 rounded border-l-4 border-indigo-600">
                  <p className="font-semibold">{exp.date} - {exp.category}</p>
                  <p className="text-gray-700">${exp.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
