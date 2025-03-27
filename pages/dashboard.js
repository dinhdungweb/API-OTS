import { useEffect, useState, useContext } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { AppContext } from '../components/AppContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard({ role }) {
  const { mappingStats } = useContext(AppContext);
  const [syncStats, setSyncStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSyncStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setSyncStats(data);
      } catch (err) {
        console.error('❌ Lỗi lấy thống kê đồng bộ:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSyncStats();
  }, []);

  const chartData = {
    labels: Object.keys(syncStats),
    datasets: [
      {
        label: 'Đồng bộ thành công',
        data: Object.values(syncStats).map((stat) => stat.success),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      },
      {
        label: 'Đồng bộ thất bại',
        data: Object.values(syncStats).map((stat) => stat.error),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Thống kê đồng bộ theo thời gian' },
    },
    scales: {
      x: { title: { display: true, text: 'Ngày' } },
      y: { title: { display: true, text: 'Số lần đồng bộ' }, beginAtZero: true },
    },
  };

  if (isLoading) {
    return <div className="text-center p-6">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">📊 Dashboard Quản trị</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">Tổng sản phẩm</h2>
          <p className="text-2xl font-bold text-blue-600">{mappingStats.total_products}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">Đã mapping</h2>
          <p className="text-2xl font-bold text-green-600">{mappingStats.mapped_count}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">Chưa mapping</h2>
          <p className="text-2xl font-bold text-red-600">{mappingStats.unmapped_count}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}