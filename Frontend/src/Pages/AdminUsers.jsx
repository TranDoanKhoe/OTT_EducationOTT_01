import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Filter,
    MoreVertical,
    Shield,
    UserCog,
    GraduationCap,
    Ban,
    CheckCircle,
    Trash2,
    KeyRound,
    Eye,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Download,
    RefreshCw,
    Activity,
    AlertCircle,
    X,
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import gsap from 'gsap';
import {
    getAdminUsers,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    resetUserPassword,
    checkAdminAccess,
    exportStatistics,
} from '../api/adminApi';
import { AdminLayout } from '../components/Admin/AdminSidebar';

const WS_URL = 'https://ott-education-be.onrender.com/ws';

const AdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const searchTimeoutRef = useRef(null);
    const socketRef = useRef(null);
    const pageRef = useRef(null);
    const token = localStorage.getItem('token');
    const pageSize = 10;

    useEffect(() => {
        checkAdmin();
        fetchUsers(true);
    }, []);

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
                fetchUsers(false);
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
    }, [token]);

    useEffect(() => {
        if (!loading) {
            fetchUsers(false);
        }
    }, [page, search, roleFilter, statusFilter]);

    useEffect(() => {
        if (!pageRef.current || loading) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                pageRef.current.querySelectorAll('[data-gsap-users-row]'),
                { autoAlpha: 0, y: 8 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.28,
                    ease: 'power2.out',
                    stagger: 0.04,
                },
            );
        }, pageRef);

        return () => ctx.revert();
    }, [users, loading]);

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

    const fetchUsers = async (isInitial = false) => {
        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setIsSearching(true);
            }
            let searchParam = search;
            let role = roleFilter || undefined;
            let status = statusFilter || undefined;

            const data = await getAdminUsers(
                token,
                page,
                pageSize,
                searchParam,
            );

            // Apply filters if any (client-side filtering)
            let filteredUsers = data.users || [];
            if (roleFilter) {
                filteredUsers = filteredUsers.filter(
                    (u) => u.role === roleFilter,
                );
            }
            if (statusFilter) {
                filteredUsers = filteredUsers.filter(
                    (u) => u.status === statusFilter,
                );
            }

            setUsers(filteredUsers);
            // Update counts based on filtered results
            if (roleFilter || statusFilter) {
                setTotalItems(filteredUsers.length);
                setTotalPages(Math.ceil(filteredUsers.length / pageSize) || 1);
            } else {
                setTotalPages(data.totalPages || 0);
                setTotalItems(data.totalItems || 0);
            }
        } catch (err) {
            setError('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchInput(value);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search - đợi 500ms sau khi người dùng ngừng gõ
        searchTimeoutRef.current = setTimeout(() => {
            setSearch(value);
            setPage(0);
        }, 500);
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            setActionLoading(true);
            await updateUserRole(token, userId, newRole);
            fetchUsers();
            setShowModal(false);
        } catch (err) {
            setError('Không thể cập nhật vai trò');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatusChange = async (userId, newStatus) => {
        try {
            setActionLoading(true);
            await updateUserStatus(token, userId, newStatus);
            fetchUsers();
            setShowModal(false);
        } catch (err) {
            setError(
                err.response?.data?.error || 'Không thể cập nhật trạng thái',
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            setActionLoading(true);
            await deleteUser(token, userId);
            fetchUsers();
            setShowModal(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể xóa người dùng');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự');
            return;
        }
        try {
            setActionLoading(true);
            await resetUserPassword(token, selectedUser.id, newPassword);
            setNewPassword('');
            setShowModal(false);
            setError(null);
        } catch (err) {
            setError('Không thể đặt lại mật khẩu');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            await exportStatistics(token, 'users');
        } catch (err) {
            setError('Không thể xuất dữ liệu');
        }
    };

    const openModal = (type, user) => {
        setSelectedUser(user);
        setModalType(type);
        setShowModal(true);
        setNewPassword('');
    };

    const getRoleBadge = (role) => {
        const roleConfig = {
            ADMIN: {
                icon: Shield,
                color: 'bg-red-100 text-red-700',
                label: 'Admin',
            },
            TEACHER: {
                icon: UserCog,
                color: 'bg-blue-100 text-blue-700',
                label: 'Giảng viên',
            },
            STUDENT: {
                icon: GraduationCap,
                color: 'bg-green-100 text-green-700',
                label: 'Sinh viên',
            },
        };
        const config = roleConfig[role] || roleConfig.STUDENT;
        const Icon = config.icon;
        return (
            <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
            >
                <Icon className="h-3 w-3" />
                {config.label}
            </span>
        );
    };

    const getStatusBadge = (status) => {
        if (status === 'ACTIVE') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <CheckCircle className="h-3 w-3" />
                    Hoạt động
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <Ban className="h-3 w-3" />
                Bị khóa
            </span>
        );
    };

    if (loading) {
        return (
            <AdminLayout
                title="Quản lý người dùng"
                subtitle="Quản lý tài khoản và phân quyền"
            >
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">
                            Đang tải dữ liệu...
                        </p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Quản lý người dùng"
            subtitle={`Tổng cộng ${totalItems} người dùng trong hệ thống`}
        >
            <div ref={pageRef}>
                {/* Action Buttons */}
                <div className="flex gap-3 mb-6" data-gsap-users-row>
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
                    <button
                        onClick={fetchUsers}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                    >
                        <RefreshCw className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-700 font-medium">
                            Làm mới
                        </span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/30"
                    >
                        <Download className="h-4 w-4" />
                        <span className="font-medium">Xuất CSV</span>
                    </button>
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

                {/* Filters */}
                <div
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6"
                    data-gsap-users-row
                >
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px] sm:min-w-[250px]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo email, tên..."
                                    value={searchInput}
                                    onChange={handleSearch}
                                    className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200"
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setPage(0);
                            }}
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 cursor-pointer"
                        >
                            <option value="">Tất cả vai trò</option>
                            <option value="ADMIN">Admin</option>
                            <option value="TEACHER">Giảng viên</option>
                            <option value="STUDENT">Sinh viên</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(0);
                            }}
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 cursor-pointer"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="BLOCKED">Bị khóa</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <p className="px-4 pt-3 pb-1 text-xs text-slate-500 sm:hidden">
                        Vuot ngang de xem tat ca cot
                    </p>
                    <div
                        className="w-full overflow-x-scroll overscroll-x-contain pb-2"
                        style={{
                            WebkitOverflowScrolling: 'touch',
                            touchAction: 'pan-x pan-y',
                        }}
                    >
                        <table className="w-full min-w-[1080px] whitespace-nowrap">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Người dùng
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Vai trò
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Ngày tạo
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        data-gsap-users-row
                                        className="hover:bg-emerald-50/50 transition-colors duration-200"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={
                                                        user.avatar ||
                                                        `https://ui-avatars.com/api/?name=${user.username || user.email}&background=random`
                                                    }
                                                    alt={user.username}
                                                    className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-100"
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-800">
                                                        {user.firstName &&
                                                        user.lastName
                                                            ? `${user.firstName} ${user.lastName}`
                                                            : user.username ||
                                                              'N/A'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(user.status)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {user.createdAt
                                                ? new Date(
                                                      user.createdAt,
                                                  ).toLocaleDateString('vi-VN')
                                                : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() =>
                                                        openModal('view', user)
                                                    }
                                                    className="p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        openModal('role', user)
                                                    }
                                                    className="p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200"
                                                    title="Đổi vai trò"
                                                >
                                                    <UserCog className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        openModal(
                                                            'status',
                                                            user,
                                                        )
                                                    }
                                                    className="p-2.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200"
                                                    title={
                                                        user.status === 'ACTIVE'
                                                            ? 'Khóa tài khoản'
                                                            : 'Mở khóa'
                                                    }
                                                >
                                                    {user.status ===
                                                    'ACTIVE' ? (
                                                        <Ban className="h-4 w-4" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        openModal(
                                                            'password',
                                                            user,
                                                        )
                                                    }
                                                    className="p-2.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
                                                    title="Đặt lại mật khẩu"
                                                >
                                                    <KeyRound className="h-4 w-4" />
                                                </button>
                                                {user.role !== 'ADMIN' && (
                                                    <button
                                                        onClick={() =>
                                                            openModal(
                                                                'delete',
                                                                user,
                                                            )
                                                        }
                                                        className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-gray-50 to-white">
                        <p className="text-sm text-gray-600">
                            Hiển thị{' '}
                            <span className="font-semibold">
                                {page * pageSize + 1}
                            </span>{' '}
                            -{' '}
                            <span className="font-semibold">
                                {Math.min((page + 1) * pageSize, totalItems)}
                            </span>{' '}
                            của{' '}
                            <span className="font-semibold">{totalItems}</span>
                        </p>
                        <div className="flex gap-2 self-end sm:self-auto">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-2 text-gray-700 font-medium">
                                Trang {page + 1} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() =>
                                    setPage(Math.min(totalPages - 1, page + 1))
                                }
                                disabled={page >= totalPages - 1}
                                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {showModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-slate-200">
                            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {modalType === 'view' &&
                                        'Thông tin người dùng'}
                                    {modalType === 'role' && 'Thay đổi vai trò'}
                                    {modalType === 'status' &&
                                        (selectedUser.status === 'ACTIVE'
                                            ? 'Khóa tài khoản'
                                            : 'Mở khóa tài khoản')}
                                    {modalType === 'password' &&
                                        'Đặt lại mật khẩu'}
                                    {modalType === 'delete' && 'Xác nhận xóa'}
                                </h3>
                            </div>

                            <div className="p-6">
                                {modalType === 'view' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={
                                                    selectedUser.avatar ||
                                                    `https://ui-avatars.com/api/?name=${selectedUser.username}&background=random`
                                                }
                                                alt={selectedUser.username}
                                                className="h-16 w-16 rounded-full object-cover ring-4 ring-slate-100"
                                            />
                                            <div>
                                                <p className="font-bold text-slate-800">
                                                    {selectedUser.firstName}{' '}
                                                    {selectedUser.lastName}
                                                </p>
                                                <p className="text-slate-500">
                                                    {selectedUser.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide">
                                                    Username
                                                </p>
                                                <p className="font-semibold text-slate-700 mt-1">
                                                    {selectedUser.username ||
                                                        'N/A'}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide">
                                                    Điện thoại
                                                </p>
                                                <p className="font-semibold text-slate-700 mt-1">
                                                    {selectedUser.phone ||
                                                        'N/A'}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                                                    Vai trò
                                                </p>
                                                {getRoleBadge(
                                                    selectedUser.role,
                                                )}
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                                                    Trạng thái
                                                </p>
                                                {getStatusBadge(
                                                    selectedUser.status,
                                                )}
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide">
                                                    Số bạn bè
                                                </p>
                                                <p className="font-semibold text-slate-700 mt-1">
                                                    {selectedUser.friendsCount ||
                                                        0}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide">
                                                    Ngày tạo
                                                </p>
                                                <p className="font-semibold text-slate-700 mt-1">
                                                    {selectedUser.createdAt
                                                        ? new Date(
                                                              selectedUser.createdAt,
                                                          ).toLocaleDateString(
                                                              'vi-VN',
                                                          )
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modalType === 'role' && (
                                    <div className="space-y-4">
                                        <p className="text-slate-600">
                                            Chọn vai trò mới cho{' '}
                                            <span className="font-semibold text-slate-800">
                                                {selectedUser.username}
                                            </span>
                                            :
                                        </p>
                                        <div className="space-y-2">
                                            {[
                                                'ADMIN',
                                                'TEACHER',
                                                'STUDENT',
                                            ].map((role) => (
                                                <button
                                                    key={role}
                                                    onClick={() =>
                                                        handleRoleChange(
                                                            selectedUser.id,
                                                            role,
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading ||
                                                        selectedUser.role ===
                                                            role
                                                    }
                                                    className={`w-full p-3.5 rounded-xl border-2 text-left transition-all duration-200
                                                        ${
                                                            selectedUser.role ===
                                                            role
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                                                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                        }`}
                                                >
                                                    {getRoleBadge(role)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {modalType === 'status' && (
                                    <div className="space-y-4">
                                        <p className="text-slate-600">
                                            Bạn có chắc muốn{' '}
                                            <span className="font-semibold">
                                                {selectedUser.status ===
                                                'ACTIVE'
                                                    ? 'khóa'
                                                    : 'mở khóa'}
                                            </span>{' '}
                                            tài khoản{' '}
                                            <span className="font-semibold text-slate-800">
                                                {selectedUser.username}
                                            </span>
                                            ?
                                        </p>
                                        {selectedUser.status === 'ACTIVE' && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                                <p className="text-sm text-amber-700">
                                                    ⚠️ Người dùng sẽ không thể
                                                    đăng nhập sau khi bị khóa.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {modalType === 'password' && (
                                    <div className="space-y-4">
                                        <p className="text-slate-600">
                                            Đặt mật khẩu mới cho{' '}
                                            <span className="font-semibold text-slate-800">
                                                {selectedUser.username}
                                            </span>
                                            :
                                        </p>
                                        <input
                                            type="password"
                                            placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200"
                                        />
                                    </div>
                                )}

                                {modalType === 'delete' && (
                                    <div className="space-y-4">
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                            <p className="text-red-700 font-bold flex items-center gap-2">
                                                <AlertCircle className="h-5 w-5" />
                                                Cảnh báo!
                                            </p>
                                            <p className="text-sm text-red-600 mt-2">
                                                Hành động này không thể hoàn
                                                tác. Tất cả dữ liệu của người
                                                dùng sẽ bị xóa vĩnh viễn.
                                            </p>
                                        </div>
                                        <p className="text-slate-600">
                                            Bạn có chắc muốn xóa tài khoản{' '}
                                            <span className="font-semibold text-slate-800">
                                                {selectedUser.username}
                                            </span>
                                            ?
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-gradient-to-r from-slate-50 to-white rounded-b-2xl">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-700 transition-all duration-200"
                                >
                                    Hủy
                                </button>
                                {modalType === 'status' && (
                                    <button
                                        onClick={() =>
                                            handleStatusChange(
                                                selectedUser.id,
                                                selectedUser.status === 'ACTIVE'
                                                    ? 'BLOCKED'
                                                    : 'ACTIVE',
                                            )
                                        }
                                        disabled={actionLoading}
                                        className={`px-5 py-2.5 rounded-xl text-white font-medium transition-all duration-200
                                        ${
                                            selectedUser.status === 'ACTIVE'
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/30'
                                                : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/30'
                                        }`}
                                    >
                                        {actionLoading
                                            ? 'Đang xử lý...'
                                            : selectedUser.status === 'ACTIVE'
                                              ? 'Khóa'
                                              : 'Mở khóa'}
                                    </button>
                                )}
                                {modalType === 'password' && (
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={actionLoading}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-medium shadow-lg shadow-blue-500/30 transition-all duration-200"
                                    >
                                        {actionLoading
                                            ? 'Đang xử lý...'
                                            : 'Đặt lại mật khẩu'}
                                    </button>
                                )}
                                {modalType === 'delete' && (
                                    <button
                                        onClick={() =>
                                            handleDeleteUser(selectedUser.id)
                                        }
                                        disabled={actionLoading}
                                        className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 font-medium shadow-lg shadow-red-500/30 transition-all duration-200"
                                    >
                                        {actionLoading
                                            ? 'Đang xử lý...'
                                            : 'Xóa vĩnh viễn'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminUsers;
