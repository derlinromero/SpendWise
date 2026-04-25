import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, X, Save, ChevronUp, ChevronDown, ChevronsUpDown, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * ExpenseList Component - Display and manage expenses
 */
function ExpenseList({ expenses, categories, onExpenseDeleted, onExpenseUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    category: '',
    newCategory: '',
    date: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage,  setItemsPerPage] = useState(10);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null
  });

  // Export to Excel
  const exportToExcel = () => {
    if (!expenses || expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    const data = expenses.map(exp => ({
      Date: exp.date,
      Description: exp.title,
      Category: exp.category,
      Amount: parseFloat(exp.amount)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({key, direction});
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Get sort icon for column
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-blue-600" />;
    }
    if (sortConfig.direction === 'desc') {
      return <ChevronDown className="w-4 h-4 text-blue-600" />;
    }
    return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
  };

  // Sort and paginate expenses
  const sortedAndPaginatedExpenses = useMemo(() => {
    let sortedExpenses = [...expenses];

    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      sortedExpenses.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'date':
            aValue = new Date(a.date);
            bValue = new Date(b.date);
            break;
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'category':
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
            break;
          case 'amount':
            aValue = parseFloat(a.amount);
            bValue = parseFloat(b.amount);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedExpenses.slice(startIndex, endIndex);
  }, [expenses, sortConfig, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(expenses.length / itemsPerPage);

  // Handle page size change
  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1); // Reset to first page
  };
  
  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/expenses/${expenseId}`);
      onExpenseDeleted(expenseId);
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const startEdit = (expense) => {
    setEditingId(expense.id);
    
    // Format date properly to avoid timezone issues
    let dateStr = expense.date;
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    
    setEditForm({
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      newCategory: '',
      date: dateStr
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({title: '', amount: '', category: '', date: ''});
  };

  const categoryToSubmit =
    editForm.category === '__new__'
      ? editForm.newCategory.trim()
      : editForm.category;

  const saveEdit = async (expenseId) => {
    try {
      const payload = {
        title: editForm.title.trim(),
        amount: parseFloat(editForm.amount),
        category: categoryToSubmit || editForm.category,
        date: editForm.date
      };
      
      const response = await axios.put(`${API_URL}/expenses/${expenseId}`, payload);

      console.log('Update response:', response.data);

      // Handle both array and single object reponse
      const updatedExpense = Array.isArray(response.data.data)
        ? response.data.data[0]
        : response.data.data;

      // Notify parent to update the list
      if (onExpenseUpdated && updatedExpense) {
        onExpenseUpdated(updatedExpense);
      }

      setEditingId(null)
      setEditForm({title: '', amount: '', category: '', date: ''});

      // Show success notification
      alert('✅ Expense updated successfully!');
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense');
    }
  };

  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-cyan-100 p-6 hover:shadow-2xl transition-all duration-300">
        <h2 className="text-xl font-bold mb-4">Total Expenses</h2>
        <p className="text-gray-500 text-center py-8">
          No expenses yet. Add your first expense above!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold mb-4">
        Total Expenses ({expenses.length})
        </h2>

        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          title="Export to Excel"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600">per page</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-2">
                  Date
                  {getSortIcon('date')}
                </div>
              </th>
              
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-2">
                  Description
                  {getSortIcon('title')}
                </div>
              </th>

              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-2">
                  Category
                  {getSortIcon('category')}
                </div>
              </th>

              <th
                className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-2">
                  Amount
                  {getSortIcon('amount')}
                </div>
              </th>

              <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndPaginatedExpenses.map((expense) => (
              <tr 
                key={expense.id} 
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                {/* Date Colum */}
                <td className="py-3 px-4 text-sm text-gray-600">
                  {editingId === expense.id ? (
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    format(new Date(expense.date + 'T00:00:00'), 'MMM dd, yyyy')
                  )}
                </td>

                {/* Description Column */}
                <td className="py-3 px-4">
                  {editingId === expense.id ? (
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    <span className="text-gray-900">{expense.title}</span>
                  )}
                </td>

                {/* Category Column */}
                <td className="py-3 px-4">
                  {editingId === expense.id ? (
                    <>
                      <select
                        value={editForm.category === '__new__' ? '__new__' : editForm.category}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '__new__') {
                            setEditForm({ ...editForm, category: '__new__', newCategory: ''});
                          } else {
                            setEditForm({ ...editForm, category: value, newCategory: ''});
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {categories && categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                        <option value="__new__" className="font-semibold">
                          + Add New Category
                        </option>
                      </select>
                      {editForm.category === '__new__' && (
                        <input
                          type="text"
                          placeholder="Enter new category name..."
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1"
                          onChange={(e) => setEditForm({ ...editForm, newCategory: e.target.value})}
                          autoFocus
                        />
                      )}
                    </>
                  ) : (
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-800 rounded-full shadow-sm">
                      {expense.category}
                    </span>
                  )}
                </td>

                {/* Amount Column */}
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  {editingId === expense.id ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || parseFloat(val) >= 0) setEditForm({ ...editForm, amount: val});
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"/>
                  ) : (
                    `$${parseFloat(expense.amount).toFixed(2)}`
                  )}
                </td>

                {/* Actions Column */}
                <td className="py-3 px-4 text-center">
                  {editingId === expense.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => saveEdit(expense.id)}
                        className="text-green-600 hover:text-green-800 transition"
                        title="Save changes"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-800 transition"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => startEdit(expense)}
                        className="text-cyan-600 hover:text-cyan-800 transition-all duration-200"
                        title="Edit expense"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, expenses.length)} of{' '}
          {expenses.length} expenses
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === 1
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700'
            }`}
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last, current, and pages around current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-2 text-gray-400">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === totalPages
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700'
            }`}
          >
            Next
          </button>
        </div>
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Total</span>
          <span className="text-2xl font-bold text-gray-900">
            ${expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ExpenseList;