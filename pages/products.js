import { useEffect, useState, useCallback, useMemo, useContext } from 'react';
import { debounce } from 'lodash';
import { saveAs } from 'file-saver';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppContext } from '../components/AppContext';
import ProductRow from '../components/ProductRow';

export default function Products({ role }) {
  const { mappingStats, fetchMappingStats } = useContext(AppContext);
  const [shopifyProducts, setShopifyProducts] = useState([]);
  const [searchQueries, setSearchQueries] = useState({});
  const [nhanhProducts, setNhanhProducts] = useState({});
  const [mappedProducts, setMappedProducts] = useState({});
  const [loadingIds, setLoadingIds] = useState([]);
  const [syncStatus, setSyncStatus] = useState({});
  const [syncErrors, setSyncErrors] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [syncLogs, setSyncLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [inventoryDetails, setInventoryDetails] = useState(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [currentNhanhvnId, setCurrentNhanhvnId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCache, setSearchCache] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const canEdit = role === 'admin' || role === 'editor';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [mappingsRes, productsRes, logsRes] = await Promise.all([
        fetch('/api/products/mappings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/products/shopify?page=${currentPage}&limit=${itemsPerPage}&filter=${filterStatus}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/sync/logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const mappingsData = await mappingsRes.json();
      const productsData = await productsRes.json();
      const logsData = await logsRes.json();

      setMappedProducts(mappingsData);
      setShopifyProducts(productsData.products);
      setTotalPages(productsData.pagination.total_pages);
      setTotalProducts(productsData.pagination.total_products);
      setSyncLogs(logsData);

      await fetchMappingStats(filterStatus);
    } catch (err) {
      console.error('❌ Lỗi tải dữ liệu:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, filterStatus]);

  const syncStatusData = useMemo(() => {
    const statusMap = {};
    const errorsMap = {};
    const latestLogs = syncLogs.reduce((acc, log) => {
      const shopifyId = log.shopifyId;
      if (!acc[shopifyId] || new Date(log.timestamp) > new Date(acc[shopifyId].timestamp)) {
        acc[shopifyId] = log;
      }
      return acc;
    }, {});

    Object.values(latestLogs).forEach((log) => {
      const shopifyId = log.shopifyId;
      if (mappedProducts[shopifyId]) {
        statusMap[shopifyId] = log.status === 'success' ? 'done' : log.status;
        errorsMap[shopifyId] = log.status === 'error' ? log.message : null;
        if (log.status === 'error') {
          toast.error(`Đồng bộ thất bại: Shopify ID ${log.shopifyId} - ${log.message}`);
        }
      }
    });

    return { syncStatus: statusMap, syncErrors: errorsMap };
  }, [syncLogs, mappedProducts]);

  useEffect(() => {
    setSyncStatus(syncStatusData.syncStatus);
    setSyncErrors(syncStatusData.syncErrors);
  }, [syncStatusData]);

  const debouncedFetchSearchResults = debounce((shopifyId, query) => {
    if (!query.trim() || query.length < 3) {
      setNhanhProducts((prev) => ({ ...prev, [shopifyId]: [] }));
      return;
    }
    const cacheKey = `${shopifyId}-${query}`;
    if (searchCache[cacheKey]) {
      setNhanhProducts((prev) => ({ ...prev, [shopifyId]: searchCache[cacheKey] }));
      return;
    }
    fetch('/api/products/nhanh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ query }),
    })
      .then((res) => res.json())
      .then((data) => {
        const products = data.products || [];
        setNhanhProducts((prev) => ({ ...prev, [shopifyId]: products }));
        setSearchCache((prev) => ({ ...prev, [cacheKey]: products }));
      })
      .catch((err) => console.error('❌ Lỗi tìm kiếm sản phẩm:', err));
  }, 500);

  const fetchSearchResults = useCallback((shopifyId, query) => {
    debouncedFetchSearchResults(shopifyId, query);
  }, []);

  const handleInputChange = (shopifyId, value) => {
    setSearchQueries((prev) => ({ ...prev, [shopifyId]: value }));
    fetchSearchResults(shopifyId, value);
  };

  const syncInventory = async (shopifyId, nhanhProduct) => {
    const shopifyProduct = shopifyProducts.find((p) => p.id === shopifyId);
    if (!shopifyProduct || !nhanhProduct) {
      setSyncStatus((prev) => ({ ...prev, [shopifyId]: 'error' }));
      setSyncErrors((prev) => ({ ...prev, [shopifyId]: 'Không tìm thấy sản phẩm' }));
      setLoadingIds((prev) => prev.filter((id) => id !== shopifyId));
      return;
    }

    const nhanhvn_id = nhanhProduct.idNhanh;
    const shopify_inventory_id = shopifyProduct.shopify_inventory_item_id;

    setLoadingIds((prev) => [...prev, shopifyId]);
    setSyncStatus((prev) => ({ ...prev, [shopifyId]: 'syncing' }));

    try {
      const response = await fetch('/api/sync/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ shopify_id: shopifyId, nhanhvn_id, shopify_inventory_id }),
      });
      const data = await response.json();
      setSyncStatus((prev) => ({ ...prev, [shopifyId]: 'done' }));
      setSyncErrors((prev) => ({ ...prev, [shopifyId]: null }));
      setSyncLogs((prev) => [
        { shopifyId, nhanhvnId: nhanhvn_id, timestamp: new Date().toISOString(), status: 'success', message: data.message },
        ...prev,
      ]);
    } catch (error) {
      const errorMessage = error.message || 'Lỗi không xác định';
      setSyncStatus((prev) => ({ ...prev, [shopifyId]: 'error' }));
      setSyncErrors((prev) => ({ ...prev, [shopifyId]: errorMessage }));
      setSyncLogs((prev) => [
        { shopifyId, nhanhvnId: nhanhvn_id, timestamp: new Date().toISOString(), status: 'error', message: errorMessage },
        ...prev,
      ]);
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== shopifyId));
    }
  };

  const handleSelectProduct = async (shopifyId, nhanhProduct) => {
    if (!canEdit) return;
    try {
      setLoadingIds((prev) => [...prev, shopifyId]);
      setSyncStatus((prev) => ({ ...prev, [shopifyId]: 'syncing' }));
      const token = localStorage.getItem('token');
      await fetch('/api/products/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mappings: { [shopifyId]: { idNhanh: nhanhProduct.idNhanh, name: nhanhProduct.name } },
        }),
      });
      const mappingsRes = await fetch('/api/products/mappings', { headers: { Authorization: `Bearer ${token}` } });
      setMappedProducts(await mappingsRes.json());

      await fetchMappingStats(filterStatus);

      const productsRes = await fetch(`/api/products/shopify?page=${currentPage}&limit=${itemsPerPage}&filter=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productsData = await productsRes.json();
      setShopifyProducts(productsData.products);
      setTotalPages(productsData.pagination.total_pages);
      setTotalProducts(productsData.pagination.total_products);

      setSearchQueries((prev) => ({ ...prev, [shopifyId]: nhanhProduct.name }));
      setNhanhProducts((prev) => ({ ...prev, [shopifyId]: [] }));

      await syncInventory(shopifyId, nhanhProduct);
    } catch (err) {
      console.error('❌ Lỗi lưu mapping:', err);
      setSyncStatus((prev) => ({ ...prev, [shopifyId]: 'error' }));
      setSyncErrors((prev) => ({ ...prev, [shopifyId]: 'Lỗi lưu mapping' }));
      setLoadingIds((prev) => prev.filter((id) => id !== shopifyId));
    }
  };

  const handleUnmapProduct = async (shopifyId) => {
    if (!canEdit) return;
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/products/mappings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shopify_id: shopifyId }),
      });
      await fetch('/api/sync/logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shopify_id: shopifyId }),
      });

      const mappingsRes = await fetch('/api/products/mappings', { headers: { Authorization: `Bearer ${token}` } });
      setMappedProducts(await mappingsRes.json());

      const logsRes = await fetch('/api/sync/logs', { headers: { Authorization: `Bearer ${token}` } });
      setSyncLogs(await logsRes.json());

      setSearchQueries((prev) => ({ ...prev, [shopifyId]: '' }));
      setNhanhProducts((prev) => ({ ...prev, [shopifyId]: [] }));
      setSyncStatus((prev) => ({ ...prev, [shopifyId]: undefined }));
      setSyncErrors((prev) => ({ ...prev, [shopifyId]: null }));

      await fetchMappingStats(filterStatus);

      const productsRes = await fetch(`/api/products/shopify?page=${currentPage}&limit=${itemsPerPage}&filter=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productsData = await productsRes.json();
      setShopifyProducts(productsData.products);
      setTotalPages(productsData.pagination.total_pages);
      setTotalProducts(productsData.pagination.total_products);
    } catch (err) {
      console.error('❌ Lỗi khi huỷ mapping:', err);
    }
  };

  const viewInventoryDetails = (shopifyId, nhanhvnId) => {
    setCurrentNhanhvnId(nhanhvnId);
    setShowInventoryModal(true);
  };

  const retrySync = async (shopifyId, nhanhvnId) => {
    const shopifyProduct = shopifyProducts.find((p) => p.id === shopifyId);
    if (!shopifyProduct || !nhanhvnId) return;
    await syncInventory(shopifyId, { idNhanh: nhanhvnId });
  };

  useEffect(() => {
    if (showInventoryModal && currentNhanhvnId) {
      fetch('/api/inventory/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ nhanhvn_id: currentNhanhvnId }),
      })
        .then((res) => res.json())
        .then((data) => setInventoryDetails(data))
        .catch((err) => {
          console.error('❌ Lỗi lấy chi tiết tồn kho:', err);
          setInventoryDetails(null);
        });
    }
  }, [showInventoryModal, currentNhanhvnId]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const csvData = useMemo(() => {
    return [
      ['Shopify ID', 'Shopify Name', 'Nhanh.vn ID', 'Nhanh.vn Name', 'Status'],
      ...shopifyProducts.map((product) => [
        product.id,
        product.name,
        mappedProducts[product.id] ? mappedProducts[product.id].idNhanh : '',
        mappedProducts[product.id] ? mappedProducts[product.id].name : '',
        syncStatus[product.id] || '-',
      ]),
    ];
  }, [shopifyProducts, mappedProducts, syncStatus]);

  const exportToCSV = () => {
    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'product_mapping_report.csv');
  };

  if (isLoading) {
    return <div className="text-center p-6">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-800">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <div className="mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">🔗 Quản lý đồng bộ Shopify ⇄ Nhanh.vn</h1>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <label className="font-medium mr-3">Lọc theo:</label>
              <select
                className="border px-3 py-1 rounded text-sm bg-white"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="mapped">Đã mapping</option>
                <option value="unmapped">Chưa mapping</option>
              </select>
            </div>
            <div>
              <label className="font-medium mr-3">Số sản phẩm/trang:</label>
              <select
                className="border px-3 py-1 rounded text-sm bg-white"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Tổng: <strong>{mappingStats.total_products}</strong> sản phẩm | Đã mapping:{' '}
              <strong>{mappingStats.mapped_count}</strong> | Chưa mapping:{' '}
              <strong>{mappingStats.unmapped_count}</strong>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
              Xuất CSV
            </button>
            <button
              onClick={() => setShowLogs(true)}
              className="px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              Xem lịch sử đồng bộ
            </button>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="w-full table-auto text-sm border border-gray-200">
            <thead className="bg-blue-100 text-left">
              <tr>
                <th className="p-3 border">SKU & Shopify ID</th>
                <th className="p-3 border">Shopify</th>
                <th className="p-3 border">Nhanh.vn</th>
                <th className="p-3 border">Tìm kiếm</th>
                <th className="p-3 border">Trạng thái</th>
                <th className="p-3 border">Chi tiết tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {shopifyProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-3 text-center text-gray-500">
                    Không có sản phẩm nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                shopifyProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    mappedProducts={mappedProducts}
                    syncStatus={syncStatus}
                    syncErrors={syncErrors}
                    loadingIds={loadingIds}
                    nhanhProducts={nhanhProducts}
                    searchQueries={searchQueries}
                    handleInputChange={handleInputChange}
                    handleSelectProduct={handleSelectProduct}
                    handleUnmapProduct={handleUnmapProduct}
                    viewInventoryDetails={viewInventoryDetails}
                    role={role}
                    retrySync={retrySync}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, totalProducts)} / {totalProducts} sản phẩm
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Trang trước
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2))
                .map((page, index, arr) => (
                  <React.Fragment key={page}>
                    {index > 0 && arr[index - 1] !== page - 1 && <span className="px-2">...</span>}
                    <button
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded text-sm ${
                        currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
        {showLogs && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Lịch sử đồng bộ</h2>
              {syncLogs.length === 0 ? (
                <p className="text-gray-500">Chưa có lịch sử đồng bộ.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left">Thời gian</th>
                      <th className="p-2 text-left">Shopify ID</th>
                      <th className="p-2 text-left">Nhanh.vn ID</th>
                      <th className="p-2 text-left">Trạng thái</th>
                      <th className="p-2 text-left">Thông tin</th>
                      {role === 'admin' && <th className="p-2 text-left">Hành động</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.slice(0, 50).map((log, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-2">{log.shopifyId}</td>
                        <td className="p-2">{log.nhanhvnId}</td>
                        <td className="p-2">
                          {log.status === 'success' ? (
                            <span className="text-green-600">Thành công</span>
                          ) : (
                            <span className="text-red-600">Thất bại</span>
                          )}
                        </td>
                        <td className="p-2">{log.message}</td>
                        {role === 'admin' && (
                          <td className="p-2">
                            {log.status === 'error' && (
                              <button
                                onClick={() => retrySync(log.shopifyId, log.nhanhvnId)}
                                className="text-blue-500 hover:underline text-xs"
                              >
                                Thử lại
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button
                onClick={() => setShowLogs(false)}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
        {showInventoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
              <h2 className="text-xl font-bold mb-4">🔍 Chi tiết tồn kho</h2>
              {inventoryDetails ? (
                <>
                  <p>
                    <strong>Tổng tồn kho:</strong> {inventoryDetails.total_remain}
                  </p>
                  <h3 className="font-semibold mt-4">Tồn kho theo kho:</h3>
                  {inventoryDetails.depots ? (
                    <table className="w-full text-sm mt-2">
                      <thead>
                        <tr>
                          <th className="p-2 text-left">Mã kho</th>
                          <th className="p-2 text-left">Số lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(inventoryDetails.depots).map(([depotId, depotInfo]) => (
                          <tr key={depotId} className="border-t">
                            <td className="p-2">{depotId}</td>
                            <td className="p-2">{depotInfo.available || depotInfo.remain || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500">Không có thông tin kho.</p>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Đang tải...</p>
              )}
              <button
                onClick={() => {
                  setShowInventoryModal(false);
                  setInventoryDetails(null);
                }}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}