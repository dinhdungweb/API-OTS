import React from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

const ProductRow = React.memo(
  ({ product, mappedProducts, syncStatus, syncErrors, loadingIds, nhanhProducts, searchQueries, handleInputChange, handleSelectProduct, handleUnmapProduct, viewInventoryDetails, role, retrySync }) => {
    const isLoading = loadingIds.includes(product.id);
    const status = syncStatus[product.id];
    const mapped = mappedProducts[product.id];
    const canEdit = role === 'admin' || role === 'editor';

    return (
      <tr className="border-t hover:bg-gray-100 transition">
        <td className="p-3">
          <div className="flex flex-col">
            <span>{product.sku || 'Không có SKU'}</span>
            <span>{product.id}</span>
          </div>
        </td>
        <td className="p-3">{product.name}</td>
        <td className="p-3">
          {mapped ? (
            <span className="text-green-700 font-semibold">{mapped.name}</span>
          ) : (
            <span className="text-gray-400">Chưa mapping</span>
          )}
        </td>
        <td className="p-3 relative">
          {canEdit ? (
            <input
              type="text"
              className="w-full border px-2 py-1 rounded text-sm bg-gray-100"
              placeholder="Nhập tên hoặc mã"
              value={searchQueries[product.id] || ''}
              onChange={(e) => handleInputChange(product.id, e.target.value)}
              disabled={mapped}
            />
          ) : (
            <span>-</span>
          )}
          {canEdit && nhanhProducts[product.id]?.length > 0 && !mapped && (
            <div className="absolute bg-white border shadow-md mt-1 w-full max-h-60 overflow-y-auto z-10 text-sm">
              {nhanhProducts[product.id].map((item, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                  onClick={() => handleSelectProduct(product.id, item)}
                >
                  {item.name} ({item.code})
                </div>
              ))}
            </div>
          )}
        </td>
        <td className="p-3">
          {isLoading ? (
            <span className="flex items-center gap-2 text-blue-500">
              <AiOutlineLoading3Quarters className="animate-spin" />
              Đang đồng bộ...
            </span>
          ) : status === 'done' ? (
            <span className="text-green-600 font-medium">Đã đồng bộ</span>
          ) : status === 'error' ? (
            <span
              className="text-red-500 cursor-pointer"
              title={syncErrors[product.id] || 'Lỗi không xác định'}
            >
              ❌ Lỗi
            </span>
          ) : (
            '-'
          )}
        </td>
        <td className="p-3">
          {mapped ? (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => viewInventoryDetails(product.id, mapped.idNhanh)}
                className="text-blue-500 hover:underline text-xs"
              >
                Xem chi tiết
              </button>
              {canEdit && (
                <button
                  onClick={() => handleUnmapProduct(product.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Hủy mapping
                </button>
              )}
            </div>
          ) : (
            '-'
          )}
        </td>
      </tr>
    );
  }
);

export default ProductRow;