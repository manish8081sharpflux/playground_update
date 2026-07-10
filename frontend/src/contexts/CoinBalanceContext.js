// Sprint5-Story-08: Coin Balance Context for real-time updates
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserCoinBalance } from '../api';
import { useAuth } from './AuthContext';

const CoinBalanceContext = createContext();

export const useCoinBalance = () => {
  const context = useContext(CoinBalanceContext);
  if (!context) {
    throw new Error('useCoinBalance must be used within CoinBalanceProvider');
  }
  return context;
};

export const CoinBalanceProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    const activeToken = token || localStorage.getItem('token');
    const roleValue = user?.role || localStorage.getItem('role');
    const role = typeof roleValue === 'string' ? roleValue : roleValue?.roleName;

    // Don't fetch if not authenticated or not a student
    if (!activeToken || role !== 'student') {
      setLoading(false);
      setBalance(null);
      return;
    }

    setLoading(true);
    try {
      const res = await getUserCoinBalance();
      const fetchedBalance = res?.data?.balance ?? null;
      setBalance(typeof fetchedBalance === 'number' ? fetchedBalance : 0);
    } catch (err) {
      // Only log error if it's not a 401 (which means user logged out)
      if (err.response?.status !== 401) {
        console.error('Failed to fetch coin balance:', err);
      }
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  const updateBalanceOptimistic = useCallback((newBalance) => {
    setBalance(newBalance);
  }, []);

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBalance, isAuthenticated, user?.id]); // Refetch after login/logout or student switch

  const value = {
    balance,
    loading,
    refreshBalance,
    updateBalanceOptimistic
  };

  return (
    <CoinBalanceContext.Provider value={value}>
      {children}
    </CoinBalanceContext.Provider>
  );
};
