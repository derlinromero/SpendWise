import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, useUser } from '@clerk/react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ResetPassword from './components/ResetPassword';

const API_URL = process.env.REACT_APP_API_URL;

const getCurrentMonth = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${today.getFullYear()}-${month}`;
};

function App() {
  const { isLoaded: authLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [monthlyLimit, setMonthlyLimit] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const navigate = useNavigate();
  const loading = !authLoaded || !userLoaded;

  useEffect(() => {
    const savedLimit = localStorage.getItem('monthlyLimit');
    if (savedLimit) setMonthlyLimit(parseFloat(savedLimit));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function configureApi() {
      if (!isSignedIn) {
        delete axios.defaults.headers.common.Authorization;
        setExpenses([]);
        setCategories([]);
        return;
      }
      const token = await getToken();
      if (!cancelled && token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        await Promise.all([fetchExpenses(), fetchCategories()]);
      }
    }
    configureApi().catch((error) => console.error('Authentication setup failed:', error));
    return () => { cancelled = true; };
  }, [getToken, isSignedIn, selectedMonth, user?.id]);

  const fetchExpenses = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const response = await axios.get(`${API_URL}/expenses`, {
      params: { year, month, all: true },
    });
    setExpenses(response.data.data);
  };

  const fetchCategories = async () => {
    const response = await axios.get(`${API_URL}/categories`);
    setCategories(response.data.data);
  };

  const session = user ? {
    user: {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      user_metadata: { full_name: user.fullName },
    },
  } : null;

  const handleSignOut = async () => {
    delete axios.defaults.headers.common.Authorization;
    await signOut();
    navigate('/', { replace: true });
  };

  const handleExpenseAdded = (expense) => {
    if (expense.date.slice(0, 7) === selectedMonth) {
      setExpenses((current) => [expense, ...current]);
    }
    fetchCategories();
  };

  const handleExpenseDeleted = (expenseId) => {
    setExpenses((current) => current.filter((expense) => expense.id !== expenseId));
  };

  const handleExpenseUpdated = (updatedExpense) => {
    setExpenses((current) => {
      if (updatedExpense.date.slice(0, 7) !== selectedMonth) {
        return current.filter((expense) => expense.id !== updatedExpense.id);
      }
      return current.map((expense) => (
        expense.id === updatedExpense.id ? updatedExpense : expense
      ));
    });
    fetchCategories();
  };

  const handleMonthlyLimit = (limit) => {
    setMonthlyLimit(limit);
    if (limit) localStorage.setItem('monthlyLimit', limit.toString());
    else localStorage.removeItem('monthlyLimit');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/ResetPassword" element={<ResetPassword />} />
      <Route path="/" element={isSignedIn ? (
        <Dashboard
          session={session}
          expenses={expenses}
          categories={categories}
          activeTab={activeTab}
          monthlyLimit={monthlyLimit}
          selectedMonth={selectedMonth}
          setActiveTab={setActiveTab}
          setSelectedMonth={setSelectedMonth}
          handleExpenseAdded={handleExpenseAdded}
          handleExpenseDeleted={handleExpenseDeleted}
          handleExpenseUpdated={handleExpenseUpdated}
          handleMonthlyLimit={handleMonthlyLimit}
          fetchExpenses={fetchExpenses}
          fetchCategories={fetchCategories}
          handleSignOut={handleSignOut}
        />
      ) : <Auth />} />
    </Routes>
  );
}

export default App;
