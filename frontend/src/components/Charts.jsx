import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL;

// Colors for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const TIME_RANGES = [
  { label: '1w', value: '1w', getStartDate: () => subDays(new Date(), 7) },
  { label: '1m', value: '1m', getStartDate: () => subMonths(new Date(), 1) },
  { label: '3m', value: '3m', getStartDate: () => subMonths(new Date(), 3) },
  { label: '6m', value: '6m', getStartDate: () => subMonths(new Date(), 6) },
  { label: '1y', value: '1y', getStartDate: () => subMonths(new Date(), 12) },
  { label: 'max', value: 'max', getStartDate: () => null },
];

/**
 * Charts Component - Visualize spending data
 */
function Charts({ userId, monthlyLimit }) {
  const [monthlyData, setMonthlyData] = useState([]);
  const [allTimeCategoryData, setAllTimeCategoryData] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [monthlyTimeRange, setMonthlyTimeRange] = useState('max');
  const [categoryTimeRange, setCategoryTimeRange] = useState('max');

  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthlyCategoryData, setMonthlyCategoryData] =useState([]);
  const [loadingMonthData, setLoadingMonthData] = useState(false);

  const getStartDate = (range) => {
    const r = TIME_RANGES.find(r => r.value === range);
    return r?.getStartDate() || null;
  };

  // Fetch monthly trends
  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        setLoadingMonthly(true);
        const startDate = getStartDate(monthlyTimeRange);
        const response = await axios.get(
          `${API_URL}/analytics/monthly/${userId}${startDate ? `?start_date=${startDate.toISOString().split('T')[0]}` : ''}`
        );
        setMonthlyData(response.data.data);
      } catch (error) {
        console.error('Error fetching monthly analytics:', error);
      } finally {
        setLoadingMonthly(false);
      }
    };
    fetchMonthly();
  }, [userId, monthlyTimeRange]);

  // Fetch category data
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoadingCategory(true);
        const startDate = getStartDate(categoryTimeRange);
        const response = await axios.get(
          `${API_URL}/analytics/category-all/${userId}${startDate ? `?start_date=${startDate.toISOString().split('T')[0]}` : ''}`
        );
        setAllTimeCategoryData(response.data.data);
      } catch (error) {
        console.error('Error fetching category analytics:', error);
      } finally {
        setLoadingCategory(false);
      }
    };
    fetchCategory();
  }, [userId, categoryTimeRange]);

  const handleMonthClick = async (data) => {
    if (!data || !data.month) return;

    const clickedMonth = data.month;
    setSelectedMonth(clickedMonth);
    setShowModal(true);
    setLoadingMonthData(true);

    try {
      // Fetch category data for this specific month
      const response = await axios.get(
        `${API_URL}/analytics/category/${userId}?month=${clickedMonth}`
      );
      setMonthlyCategoryData(response.data.data);
    } catch (error) {
      console.error('Error fetching month category data:', error);
      setMonthlyCategoryData([]);
    } finally {
      setLoadingMonthData(false);
    }
  };

  const hasMonthlyData = monthlyData && monthlyData.length > 0;
  const hasAllTimeCategoryData = allTimeCategoryData && allTimeCategoryData.length > 0;
  
  if (!hasMonthlyData && !hasAllTimeCategoryData && !loadingMonthly && !loadingCategory) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-cyan-100 p-6 hover:shadow-2xl hover:scale-[1.01] transition-all durantion-300">
        <p className="text-center text-gray-500 py-8">
          No expenses yet. Add some expenses to see analytics!
        </p>
      </div>
    );
  }

  const generateColors = (count) => {
    const baseColors = ['#06b6d4', '#0ea5e9', '#3b82f6', '#14b8a6', '#0284c7', '#06b6d4'];
    return Array.from({length: count}, (_, i) =>
      baseColors[i % baseColors.length] // golden-angle to avoid repeats
    );
  };

  const colors = generateColors(allTimeCategoryData.length);
  
  return (
    <>
      <div className="space-y-6">
        {/* Monthly Trends */}
        {monthlyData.length > 0 && (
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-cyan-100 p-6 hover:shadow-2xl hover:scale-[1.01] transition-all durantion-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                Monthly Spending Trends
              </h2>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setMonthlyTimeRange(range.value)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      monthlyTimeRange === range.value
                        ? 'bg-white text-cyan-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            {loadingMonthly ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  style={{ fontSize: '14px' }}
                />
                <YAxis 
                  style={{ fontSize: '14px' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Total Spent']}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Total Spent"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{r: 6, onClick: (e, payload) => handleMonthClick(payload.payload) }}
                />

                {/* Monthly Limit Reference Line */}
                {monthlyLimit && (
                  <ReferenceLine
                    y={monthlyLimit}
                    stroke="red"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: `Limit: $${monthlyLimit.toFixed(2)}`,
                      position: 'right',
                      fill: 'red',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            )}
            {/* Custom Legend for Monthly Limit*/}
            {monthlyLimit && (
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-blue-600"></div>
                  <span className="text-gray-700">Total Spent</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="32" height="4">
                    <line x1="0" y1="2" x2="32" y2="2" stroke="red" strokeWidth="2" strokeDasharray="5 5" />
                  </svg>
                  <span className="text-gray-700">Monthly Limit: ${monthlyLimit.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All-Time Category Spending */}
        {allTimeCategoryData.length > 0 && (
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-cyan-100 p-6 hover:shadow-2xl hover:scale-[1.01] transition-all durantion-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Money Spent by Category</h2>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setCategoryTimeRange(range.value)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      categoryTimeRange === range.value
                        ? 'bg-white text-cyan-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            {loadingCategory ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={allTimeCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  style={{ fontSize: '14px' }}
                />
                <YAxis 
                  style={{ fontSize: '14px' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Total Spent']}
                />
                <Bar dataKey="amount">
                  {allTimeCategoryData.map((entry, index) => (
                    <Cell key={index} fill={colors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
      {/* Mondal for Month Category Breakdown */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white/95 rounded-2xl shadow-2xl border border-cyan-200 p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Category Breackdown - {selectedMonth}
                </h2>
                {monthlyCategoryData.length > 0 && (
                  <p className="text-lg text-gray-600 mt-1">
                    Total Spent: <span className="font-semibold text-cyan-600">
                      ${monthlyCategoryData.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            {loadingMonthData ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading category data...</p>
              </div>
            ) : monthlyCategoryData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No expenses found for this month.</p>
              </div>
            ) : (
              <>
                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="category"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{fontSize: '14px' }}
                    />
                    <YAxis
                      style={{fontSize: '14px' }}
                    />
                    <Tooltip
                      formatter={(value) => [`$${value.toFixed(2)}`, 'Spent']}
                    />
                    <Bar dataKey="amount">
                      {monthlyCategoryData.map((entry, index) => (
                      <Cell key={index} fill={colors[index]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Charts;