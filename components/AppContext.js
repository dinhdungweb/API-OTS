import { createContext, useState, useCallback } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [mappingStats, setMappingStats] = useState({
    total_products: 0,
    mapped_count: 0,
    unmapped_count: 0,
  });

  const fetchMappingStats = useCallback(async (filterStatus = 'all') => {
    try {
      const response = await fetch(`/api/products/stats?filter=${filterStatus}`);
      const data = await response.json();
      setMappingStats(data);
    } catch (err) {
      console.error('❌ Lỗi lấy thống kê mapping:', err);
      setMappingStats({
        total_products: 0,
        mapped_count: 0,
        unmapped_count: 0,
      });
    }
  }, []);

  return (
    <AppContext.Provider value={{ mappingStats, fetchMappingStats }}>
      {children}
    </AppContext.Provider>
  );
};