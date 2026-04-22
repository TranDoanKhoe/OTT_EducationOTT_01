import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare,
    Search,
    Users,
    Trash2,
    Eye,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Download,
    RefreshCw,
    AlertCircle,
    X,
    Shield,
    UserCog,
    GraduationCap,
    Calendar,
    Activity,
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
    getAdminGroups,
    getAdminGroupDetails,
    deleteGroup,
    assignTeacherToGroup,
    removeMemberFromGroup,
    getAdminUsers,
    checkAdminAccess,
    exportStatistics,
} from '../api/adminApi';
import { AdminLayout } from '../components/Admin/AdminSidebar';

const WS_URL = 'https://ott-education-be.onrender.com/ws';

const AdminGroups = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const searchTimeoutRef = useRef(null);
    const socketRef = useRef(null);
    const token = localStorage.getItem('token');
    const pageSize = 10;

    useEffect(() => {
        checkAdmin();
        fetchGroups(true);
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
                fetchGroups(false);
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
            fetchGroups(false);
        }
    }, [page, search]);

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

    const fetchGroups = async (isInitial = false) => {
        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setIsSearching(true);
            }
            const data = await getAdminGroups(token, page, pageSize, search);
            setGroups(data.groups || []);
            setTotalPages(data.totalPages || 0);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError('Không thể tải danh sách nhóm');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            // Get all users and filter teachers
            const data = await getAdminUsers(token, 0, 100, '');
            const teacherList = (data.users || []).filter(
                (u) => u.role === 'TEACHER' || u.role === 'ADMIN',
            );
            setTeachers(teacherList);
        } catch (err) {
            console.error('Error fetching teachers:', err);
        }
    };

    const fetchGroupDetails = async (groupId) => {
        try {
            const data = await getAdminGroupDetails(token, groupId);
            setSelectedGroup(data);
        } catch (err) {
            setError('Không thể tải thông tin nhóm');
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

    const handleDeleteGroup = async (groupId) => {
        try {
            setActionLoading(true);
            await deleteGroup(token, groupId);
            fetchGroups();
            setShowModal(false);
        } catch (err) {
            setError('Không thể xóa nhóm');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignTeacher = async () => {
        if (!selectedTeacher) {
            setError('Vui lòng chọn giảng viên');
            return;
        }
        try {
            setActionLoading(true);
            await assignTeacherToGroup(
                token,
                selectedGroup.id,
                selectedTeacher,
            );
            await fetchGroupDetails(selectedGroup.id);
            setSelectedTeacher('');
            setShowModal(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể gán giảng viên');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            setActionLoading(true);
            await removeMemberFromGroup(token, selectedGroup.id, memberId);
            await fetchGroupDetails(selectedGroup.id);
        } catch (err) {
            setError('Không thể xóa thành viên');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            await exportStatistics(token, 'groups');
        } catch (err) {
            setError('Không thể xuất dữ liệu');
        }
    };

    const openModal = async (type, group) => {
        setModalType(type);
        if (group) {
            await fetchGroupDetails(group.id);
        }
        if (type === 'assign') {
            await fetchTeachers();
        }
        setShowModal(true);
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
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
            >
                <Icon className="h-3 w-3" />
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <AdminLayout
                title="Quản lý nhóm chat"
                subtitle="Quản lý các nhóm và thành viên"
            >
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto"></div>
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
            title="Quản lý nhóm chat"
            subtitle={`Tổng cộng ${totalItems} nhóm trong hệ thống`}
        >
            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
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
                    onClick={fetchGroups}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-700 font-medium">Làm mới</span>
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

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên nhóm..."
                        value={searchInput}
                        onChange={handleSearch}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200"
                    />
                    {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-300 group"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/30 group-hover:scale-105 transition-transform duration-300">
                                    {group.avatar ? (
                                        <img
                                            src={group.avatar}
                                            alt={group.name}
                                            className="h-full w-full rounded-xl object-cover"
                                        />
                                    ) : (
                                        <MessageSquare className="h-7 w-7 text-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate text-lg">
                                        {group.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                            <Users className="h-3.5 w-3.5" />
                                            {group.memberCount || 0} thành viên
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    Tạo:{' '}
                                    {group.createdAt
                                        ? new Date(
                                              group.createdAt,
                                          ).toLocaleDateString('vi-VN')
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 flex justify-end gap-1">
                            <button
                                onClick={() => openModal('view', group)}
                                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                                title="Xem chi tiết"
                            >
                                <Eye className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => openModal('assign', group)}
                                className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-200"
                                title="Gán giảng viên"
                            >
                                <UserPlus className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => openModal('delete', group)}
                                className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                                title="Xóa nhóm"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {groups.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">
                        Không tìm thấy nhóm nào
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                        Hãy thử thay đổi từ khóa tìm kiếm
                    </p>
                </div>
            )}

            {/* Pagination */}
            {groups.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                        Hiển thị{' '}
                        <span className="font-semibold">
                            {page * pageSize + 1}
                        </span>{' '}
                        -{' '}
                        <span className="font-semibold">
                            {Math.min((page + 1) * pageSize, totalItems)}
                        </span>{' '}
                        của <span className="font-semibold">{totalItems}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 text-slate-700 font-medium">
                            Trang {page + 1} / {totalPages || 1}
                        </span>
                        <button
                            onClick={() =>
                                setPage(Math.min(totalPages - 1, page + 1))
                            }
                            disabled={page >= totalPages - 1}
                            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && selectedGroup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <h3 className="text-lg font-bold text-slate-800">
                                {modalType === 'view' && 'Thông tin nhóm'}
                                {modalType === 'assign' &&
                                    'Gán giảng viên phụ trách'}
                                {modalType === 'delete' && 'Xác nhận xóa nhóm'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {modalType === 'view' && (
                                <div className="space-y-6">
                                    {/* Group Info */}
                                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                                        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                                            {selectedGroup.avatar ? (
                                                <img
                                                    src={selectedGroup.avatar}
                                                    alt={selectedGroup.name}
                                                    className="h-full w-full rounded-xl object-cover"
                                                />
                                            ) : (
                                                <MessageSquare className="h-8 w-8 text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xl text-slate-800">
                                                {selectedGroup.name}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-sm">
                                                    <Users className="h-4 w-4 text-blue-500" />
                                                    {selectedGroup.memberCount ||
                                                        0}{' '}
                                                    thành viên
                                                </span>
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-sm">
                                                    <Activity className="h-4 w-4 text-green-500" />
                                                    {selectedGroup.messageCount ||
                                                        0}{' '}
                                                    tin nhắn
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Members List */}
                                    <div>
                                        <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-500" />
                                            Danh sách thành viên
                                        </h5>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {(
                                                selectedGroup.membersInfo || []
                                            ).map((member) => (
                                                <div
                                                    key={member.id}
                                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={
                                                                member.avatar ||
                                                                `https://ui-avatars.com/api/?name=${member.username}&background=random`
                                                            }
                                                            alt={
                                                                member.username
                                                            }
                                                            className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                                                        />
                                                        <div>
                                                            <p className="font-semibold text-slate-800">
                                                                {member.firstName &&
                                                                member.lastName
                                                                    ? `${member.firstName} ${member.lastName}`
                                                                    : member.username ||
                                                                      member.email}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                {getRoleBadge(
                                                                    member.role,
                                                                )}
                                                                {member.groupRole ===
                                                                    'ADMIN' && (
                                                                    <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                                                                        Quản trị
                                                                        nhóm
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            handleRemoveMember(
                                                                member.id,
                                                            )
                                                        }
                                                        disabled={actionLoading}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Xóa khỏi nhóm"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!selectedGroup.membersInfo ||
                                                selectedGroup.membersInfo
                                                    .length === 0) && (
                                                <p className="text-slate-500 text-center py-8">
                                                    Không có thành viên
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalType === 'assign' && (
                                <div className="space-y-4">
                                    <p className="text-slate-600">
                                        Chọn giảng viên để gán phụ trách nhóm{' '}
                                        <span className="font-semibold text-slate-800">
                                            {selectedGroup.name}
                                        </span>
                                        :
                                    </p>
                                    <select
                                        value={selectedTeacher}
                                        onChange={(e) =>
                                            setSelectedTeacher(e.target.value)
                                        }
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200"
                                    >
                                        <option value="">
                                            -- Chọn giảng viên --
                                        </option>
                                        {teachers.map((teacher) => (
                                            <option
                                                key={teacher.id}
                                                value={teacher.id}
                                            >
                                                {teacher.firstName &&
                                                teacher.lastName
                                                    ? `${teacher.firstName} ${teacher.lastName}`
                                                    : teacher.username}{' '}
                                                ({teacher.email}) -{' '}
                                                {teacher.role}
                                            </option>
                                        ))}
                                    </select>
                                    {teachers.length === 0 && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                            <p className="text-sm text-amber-700">
                                                ⚠️ Không có giảng viên nào. Hãy
                                                cấp quyền TEACHER cho người dùng
                                                trước.
                                            </p>
                                        </div>
                                    )}
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
                                            Hành động này sẽ xóa nhóm và tất cả
                                            tin nhắn trong nhóm. Không thể hoàn
                                            tác.
                                        </p>
                                    </div>
                                    <p className="text-slate-600">
                                        Bạn có chắc muốn xóa nhóm{' '}
                                        <span className="font-semibold text-slate-800">
                                            {selectedGroup.name}
                                        </span>
                                        ?
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-gradient-to-r from-slate-50 to-white">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-700 transition-all duration-200"
                            >
                                {modalType === 'view' ? 'Đóng' : 'Hủy'}
                            </button>
                            {modalType === 'assign' && (
                                <button
                                    onClick={handleAssignTeacher}
                                    disabled={actionLoading || !selectedTeacher}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 font-medium shadow-lg shadow-blue-500/30 transition-all duration-200"
                                >
                                    {actionLoading
                                        ? 'Đang xử lý...'
                                        : 'Gán giảng viên'}
                                </button>
                            )}
                            {modalType === 'delete' && (
                                <button
                                    onClick={() =>
                                        handleDeleteGroup(selectedGroup.id)
                                    }
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 font-medium shadow-lg shadow-red-500/30 transition-all duration-200"
                                >
                                    {actionLoading
                                        ? 'Đang xử lý...'
                                        : 'Xóa nhóm'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminGroups;
