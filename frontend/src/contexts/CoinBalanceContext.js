// Sprint5-Story-08: Coin Balance Context for real-time updates
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserCoinBalance } from '../api';

const CoinBalanceContext = createContext();

export const useCoinBalance = () => {
  const context = useContext(CoinBalanceContext);
  if (!context) {
    throw new Error('useCoinBalance must be used within CoinBalanceProvider');
  }
  return context;
};

export const CoinBalanceProvider = ({ children }) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    // Don't fetch if not authenticated or not a student
    if (!token || role !== 'student') {
      setLoading(false);
      setBalance(0);
      return;
    }

    try {
      const res = await getUserCoinBalance();
      const fetchedBalance = res?.data?.balance ?? null;
      setBalance(typeof fetchedBalance === 'number' ? fetchedBalance : 0);
    } catch (err) {
      // Only log error if it's not a 401 (which means user logged out)
      if (err.response?.status !== 401) {
        console.error('Failed to fetch coin balance:', err);
      }
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  const updateBalanceOptimistic = useCallback((newBalance) => {
    setBalance(newBalance);
  }, []);

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

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
