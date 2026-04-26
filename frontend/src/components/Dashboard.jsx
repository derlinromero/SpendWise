import React from 'react';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import Charts from './Charts';
import CategoryManager from './CategoryManager';
import MonthlyLimitForm from './MonthlyLimitForm';
import { LogOut, Sparkles } from 'lucide-react';
import { useSingleTabGuard } from '../hooks/useSingleTabGuard';
import SingleTabWarning from './SingleTabWarning';

function Dashboard({ 
    session,
    expenses,
    categories,
    activeTab,
    monthlyLimit,
    setActiveTab,
    handleExpenseAdded,
    handleExpenseDeleted,
    handleExpenseUpdated,
    handleSignOut,
    handleMonthlyLimit,
    fetchExpenses,
    fetchCategories}) {
    
    // Detect duplicate tab
    const isDuplicateTab = useSingleTabGuard(session?.user?.id);
    
    // Main Dashboard
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
                <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-cyan-400" />
                    SpendWise
                </h1>
                <p className="text-sm text-cyan-200 mt-1">
                    Welcome back, {session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}
                </p>
                </div>
                <div className="flex gap-2">
                <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
                </div>
            </div>
            </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white/80 backdrop-blur-md border-b border-cyan-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
                {[
                { id: 'overview', label: 'Overview' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'categories', label: 'Categories' },
                ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                        ? 'border-cyan-500 text-cyan-600 font-semibold'
                        : 'border-transparent text-gray-600 hover:text-cyan-600 hover:border-cyan-300'
                    }`}
                >
                    {tab.label}
                </button>
                ))}
            </nav>
            </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Duplicate tab warning */}
            {isDuplicateTab && <SingleTabWarning />}

            {activeTab === 'overview' && (
            <div className="space-y-6">
                {/* Add Expense Form */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <ExpenseForm
                    userId={session.user.id}
                    categories={categories}
                    onExpenseAdded={handleExpenseAdded}
                />
                </div>

                {/* Monthly Limit Section */}
                <MonthlyLimitForm
                    monthlyLimit={monthlyLimit}
                    handleMonthlyLimit={handleMonthlyLimit}
                />
                
                {/* Expense List */}
                <ExpenseList
                expenses={expenses}
                categories={categories}
                onExpenseDeleted={handleExpenseDeleted}
                onExpenseUpdated={handleExpenseUpdated}
                />
            </div>
            )}

            {activeTab === 'analytics' && (
                <Charts
                    userId={session.user.id}
                    monthlyLimit={monthlyLimit}
                />
            )}

            {activeTab === 'categories' && (
            <CategoryManager
                userId={session.user.id}
                categories={categories}
                onCategoriesUpdated={fetchCategories}
            />
            )}
        </main>

        {/* Footer */}
        <footer className="bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 border-t border-cyan-900 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-sm text-cyan-200">
                Built using React, FastAPI & Supabase
            </p>
            </div>
        </footer>
        </div>
    ); 
}

export default Dashboard;