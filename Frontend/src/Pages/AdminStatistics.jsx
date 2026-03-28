import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    Users,
    MessageSquare,
    ArrowLeft,
    Download,
    RefreshCw,
    AlertCircle,
    X,
    Calendar,
    Shield,
    UserCog,
    GraduationCap,
    BarChart3,
    Activity,
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
    getDetailedStatistics,
    exportStatistics,
    checkAdminAccess,
} from '../api/adminApi';
import { AdminLayout } from '../components/Admin/AdminSidebar';

const WS_URL = 'https://ott-education-be.onrender.com/ws';

const AdminStatistics = () => {
    const navigate = useNavigate();
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('week');
    const [wsConnected, setWsConnected] = useState(false);
    const socketRef = useRef(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        checkAdmin();
        fetchStatistics();
    }, [period]);

    useEffect(() => {
        if (!token) return;

        const userId = localStorage.getItem('userId') || 'admin';
        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
                userId,
            },
            reconnectDelay: 5000,
        });

        socketRef.current = client;

        client.onConnect = () => {
            setWsConnected(true);
            client.subscribe('/topic/admin/changes', () => {
                fetchStatistics();
            });
        };

        client.onWebSocketClose = () => setWsConnected(false);
        client.onStompError = () => setWsConnected(false);

        client.activate();

        return () => {
            setWsConnected(false);
            if (socketRef.current) {
                socketRef.current.deactivate();
                socketRef.current = null;
            }
        };
    }, [period, token]);

    const checkAdmin = async () => {
        try {
            const result = await checkAdminAccess(token);
            if (!result.isAdmin) {
                navigate('/');
            }
        } catch (err) {
            navigate('/');
        }
    };

    const fetchStatistics = async () => {
        try {
            setLoading(true);
            const data = await getDetailedStatistics(token, period);
            setStatistics(data);
        } catch (err) {
            setError('Không thể tải dữ liệu thống kê');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type) => {
        try {
            await exportStatistics(token, type);
        } catch (err) {
            setError('Không thể xuất dữ liệu');
        }
    };

    // Simple bar chart component
    const BarChart = ({ data, title, color, icon: Icon }) => {
        const maxValue = Math.max(...data.map((d) => d.count), 1);

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    {Icon && <Icon className="h-5 w-5 text-blue-500" />}
                    {title}
                </h3>
                <div className="space-y-3">
                    {data.slice(-7).map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-20 flex-shrink-0 font-medium">
                                {new Date(item.date).toLocaleDateString(
                                    'vi-VN',
                                    { day: '2-digit', month: '2-digit' },
                                )}
                            </span>
                            <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
                                    style={{
                                        width: `${(item.count / maxValue) * 100}%`,
                                    }}
                                ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-700 w-12 text-right">
                                {item.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Donut chart for role distribution
    const DonutChart = ({ data }) => {
        const total = Object.values(data || {}).reduce((a, b) => a + b, 0) || 1;
        const colors = {
            ADMIN: '#EF4444',
            TEACHER: '#3B82F6',
            STUDENT: '#22C55E',
        };

        let currentAngle = 0;
        const segments = Object.entries(data || {}).map(([role, count]) => {
            const percentage = (count / total) * 100;
            const startAngle = currentAngle;
            currentAngle += (percentage / 100) * 360;
            return {
                role,
                count,
                percentage,
                startAngle,
                endAngle: currentAngle,
                color: colors[role],
            };
        });

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Phân bố vai trò người dùng
                </h3>
                <div className="flex items-center justify-center gap-8">
                    {/* Simple visual representation */}
                    <div className="relative w-40 h-40">
                        <svg
                            viewBox="0 0 100 100"
                            className="transform -rotate-90 drop-shadow-md"
                        >
                            {segments.map((seg, i) => {
                                const radius = 40;
                                const circumference = 2 * Math.PI * radius;
                                const offset =
                                    (seg.startAngle / 360) * circumference;
                                const length =
                                    (seg.percentage / 100) * circumference;

                                return (
                                    <circle
                                        key={i}
                                        cx="50"
                                        cy="50"
                                        r={radius}
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth="20"
                                        strokeDasharray={`${length} ${circumference - length}`}
                                        strokeDashoffset={-offset}
                                        className="transition-all duration-700"
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center bg-white rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-inner">
                                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    {total}
                                </p>
                                <p className="text-xs text-gray-500">Tổng</p>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-3">
                        {segments.map((seg, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div
                                    className="w-4 h-4 rounded-full shadow-sm"
                                    style={{ backgroundColor: seg.color }}
                                ></div>
                                <div>
                                    <p className="font-semibold text-gray-700">
                                        {seg.role === 'ADMIN' &&
                                            'Quản trị viên'}
                                        {seg.role === 'TEACHER' && 'Giảng viên'}
                                        {seg.role === 'STUDENT' && 'Sinh viên'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {seg.count} ({seg.percentage.toFixed(1)}
                                        %)
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Top users/groups list
    const TopList = ({ data, title, icon: Icon, type }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Icon className="h-5 w-5 text-emerald-500" />
                {title}
            </h3>
            <div className="space-y-3">
                {(data || []).slice(0, 5).map((item, index) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-emerald-200 transition-all duration-200"
                    >
                        <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg
                                ${
                                    index === 0
                                        ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                                        : index === 1
                                          ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                                          : index === 2
                                            ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                                            : 'bg-gradient-to-br from-gray-300 to-gray-400'
                                }`}
                        >
                            {index + 1}
                        </span>
                        {type === 'user' ? (
                            <>
                                <img
                                    src={
                                        item.avatar ||
                                        `https://ui-avatars.com/api/?name=${item.username}&background=random`
                                    }
                                    alt={item.username}
                                    className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">
                                        {item.firstName && item.lastName
                                            ? `${item.firstName} ${item.lastName}`
                                            : item.username || item.email}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {item.email}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                    {item.avatar ? (
                                        <img
                                            src={item.avatar}
                                            alt={item.name}
                                            className="h-full w-full rounded-xl object-cover"
                                        />
                                    ) : (
                                        <MessageSquare className="h-5 w-5 text-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">
                                        {item.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {item.memberCount || 0} thành viên
                                    </p>
                                </div>
                            </>
                        )}
                        <div className="text-right">
                            <p className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                {item.messageCount}
                            </p>
                            <p className="text-xs text-gray-500">tin nhắn</p>
                        </div>
                    </div>
                ))}
                {(!data || data.length === 0) && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Icon className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500">Chưa có dữ liệu</p>
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <AdminLayout
                title="Thống kê & Báo cáo"
                subtitle="Phân tích dữ liệu hệ thống"
            >
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">
                            Đang tải dữ liệu thống kê...
                        </p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Thống kê & Báo cáo"
            subtitle="Phân tích dữ liệu hệ thống"
        >
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-3">
                    <div
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium ${
                            wsConnected
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                    >
                        <Activity className="h-4 w-4" />
                        {wsConnected ? 'Realtime ON' : 'Realtime OFF'}
                    </div>

                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 cursor-pointer font-medium text-slate-700"
                    >
                        <option value="week">7 ngày qua</option>
                        <option value="month">30 ngày qua</option>
                        <option value="year">1 năm qua</option>
                    </select>
                    <button
                        onClick={fetchStatistics}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                    >
                        <RefreshCw className="h-4 w-4 text-slate-600" />
                        <span className="text-slate-700 font-medium">
                            Làm mới
                        </span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <span className="text-red-700 font-medium">
                            {error}
                        </span>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-red-600" />
                    </button>
                </div>
            )}

            {/* Export Buttons */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Download className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-gray-800">
                                Xuất báo cáo
                            </span>
                            <p className="text-sm text-gray-500">
                                Tải xuống dữ liệu định dạng CSV
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleExport('users')}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all duration-200 font-medium"
                        >
                            <Users className="h-4 w-4" />
                            Người dùng
                        </button>
                        <button
                            onClick={() => handleExport('groups')}
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all duration-200 font-medium"
                        >
                            <MessageSquare className="h-4 w-4" />
                            Nhóm chat
                        </button>
                        <button
                            onClick={() => handleExport('messages')}
                            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 flex items-center gap-2 shadow-lg shadow-purple-500/30 transition-all duration-200 font-medium"
                        >
                            <Activity className="h-4 w-4" />
                            Tin nhắn
                        </button>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {statistics?.newUsersByDay && (
                    <BarChart
                        data={statistics.newUsersByDay}
                        title="Người dùng mới theo ngày"
                        color="bg-gradient-to-r from-blue-400 to-blue-600"
                        icon={Users}
                    />
                )}
                {statistics?.messagesByDay && (
                    <BarChart
                        data={statistics.messagesByDay}
                        title="Tin nhắn theo ngày"
                        color="bg-gradient-to-r from-purple-400 to-purple-600"
                        icon={MessageSquare}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {statistics?.roleDistribution && (
                    <DonutChart data={statistics.roleDistribution} />
                )}
                {statistics?.groupsByDay && (
                    <div className="lg:col-span-2">
                        <BarChart
                            data={statistics.groupsByDay}
                            title="Nhóm mới theo ngày"
                            color="bg-gradient-to-r from-emerald-400 to-green-600"
                            icon={Activity}
                        />
                    </div>
                )}
            </div>

            {/* Top Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopList
                    data={statistics?.topActiveUsers}
                    title="Top người dùng hoạt động"
                    icon={Users}
                    type="user"
                />
                <TopList
                    data={statistics?.topActiveGroups}
                    title="Top nhóm sôi động"
                    icon={MessageSquare}
                    type="group"
                />
            </div>
        </AdminLayout>
    );
};

export default AdminStatistics;
