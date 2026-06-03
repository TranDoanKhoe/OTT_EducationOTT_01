import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    AlertCircle,
    BarChart3,
    CalendarDays,
    ChevronRight,
    GraduationCap,
    LayoutGrid,
    LogOut,
    Menu,
    MessageSquare,
    Shield,
    TrendingUp,
    UserCog,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { checkAdminAccess, getAdminStats } from '../api/adminApi';
import ParallaxHoverCard from '../components/effects/ParallaxHoverCard';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const token = localStorage.getItem('token');
    const showSidebarLabels = desktopSidebarExpanded || mobileSidebarOpen;

    useEffect(() => {
        checkAdmin();
        fetchStats();
    }, []);

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

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAdminStats(token);
            setStats(data);
        } catch (err) {
            setError('Không thể tải dữ liệu thống kê');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const todayLabel = useMemo(() => {
        return new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }, []);

    const toPercent = (value, total) => {
        if (!total) return 0;
        return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
    };

    const sidebarItems = [
        {
            icon: LayoutGrid,
            label: 'Dashboard',
            path: '/admin/dashboard',
            active: true,
        },
        { icon: Users, label: 'Quản lý người dùng', path: '/admin/users' },
        { icon: MessageSquare, label: 'Quản lý nhóm', path: '/admin/groups' },
        { icon: TrendingUp, label: 'Thống kê', path: '/admin/statistics' },
    ];

    const quickActions = [
        {
            icon: Users,
            label: 'Quản lý người dùng',
            desc: 'Chỉnh role, khóa/mở tài khoản',
            path: '/admin/users',
            color: 'from-emerald-500 to-teal-500',
        },
        {
            icon: MessageSquare,
            label: 'Quản lý nhóm',
            desc: 'Theo dõi nhóm và thành viên',
            path: '/admin/groups',
            color: 'from-cyan-500 to-sky-500',
        },
        {
            icon: TrendingUp,
            label: 'Xem thống kê',
            desc: 'Biểu đồ hoạt động hệ thống',
            path: '/admin/statistics',
            color: 'from-amber-500 to-orange-500',
        },
        {
            icon: MessageSquare,
            label: 'Về trang chat',
            desc: 'Quay về không gian người dùng',
            path: '/home',
            color: 'from-fuchsia-500 to-pink-500',
        },
    ];

    const MetricCard = ({ icon: Icon, title, value, accent, hint }) => (
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-5 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-500">
                        {title}
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                        {(value || 0).toLocaleString()}
                    </p>
                    {hint ? (
                        <p className="mt-2 text-xs text-slate-500">{hint}</p>
                    ) : null}
                </div>
                <ParallaxHoverCard className="shrink-0">
                    <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} shadow-md`}
                    >
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                </ParallaxHoverCard>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
                    <p className="mt-4 text-slate-600">Đang tải dashboard...</p>
                </div>
            </div>
        );
    }

    const sidebarWidthClass = desktopSidebarExpanded
        ? 'lg:pl-[18rem]'
        : 'lg:pl-[6.25rem]';

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#eef4f3]">
            <div className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute top-20 right-0 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />

            {mobileSidebarOpen && (
                <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden"
                    aria-label="Đóng menu"
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-40 h-screen w-[85vw] max-w-[20rem] border-r border-white/30 bg-gradient-to-b from-[#0a8f6a] via-[#0b7e64] to-[#0f5f58] text-white shadow-2xl transition-all duration-300 lg:max-w-none ${
                    desktopSidebarExpanded ? 'lg:w-[18rem]' : 'lg:w-[6.25rem]'
                } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                <div className="flex h-full flex-col">
                    <div className="border-b border-white/15 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                                <Shield className="h-5 w-5" />
                            </div>
                            {showSidebarLabels && (
                                <div>
                                    <p className="text-lg font-extrabold tracking-tight">
                                        OTT Admin
                                    </p>
                                    <p className="text-xs text-white/80">
                                        Control Center
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1 p-3">
                        {sidebarItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setMobileSidebarOpen(false);
                                }}
                                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                                    item.active
                                        ? 'bg-white/18 text-white shadow-md'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {showSidebarLabels && (
                                    <span className="text-sm font-semibold">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="border-t border-white/15 p-3">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-red-100 transition-colors hover:bg-red-500/20 hover:text-white"
                        >
                            <LogOut className="h-5 w-5" />
                            {showSidebarLabels && (
                                <span className="text-sm font-semibold">
                                    Đăng xuất
                                </span>
                            )}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setDesktopSidebarExpanded((prev) => !prev)
                        }
                        className="absolute -right-3 top-24 hidden h-7 w-7 items-center justify-center rounded-full border border-emerald-100 bg-white text-emerald-700 shadow lg:flex"
                        aria-label="Thu gọn sidebar"
                    >
                        {desktopSidebarExpanded ? (
                            <X className="h-3.5 w-3.5" />
                        ) : (
                            <Menu className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </aside>

            <main
                className={`relative z-10 p-4 sm:p-6 lg:p-8 ${sidebarWidthClass} transition-all duration-300`}
            >
                <header className="mb-6 rounded-3xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileSidebarOpen(true)}
                                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
                                aria-label="Mở menu"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    Dashboard
                                </h1>
                                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                                    Theo dõi toàn bộ hệ thống OTT Education theo
                                    thời gian thực
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:text-sm">
                                <CalendarDays className="h-4 w-4 text-emerald-600" />
                                {todayLabel}
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-2 text-xs font-semibold text-white sm:px-3 sm:text-sm">
                                <Shield className="h-4 w-4" />
                                Xin chào, Admin
                            </div>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                    </div>
                )}

                <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon={Users}
                        title="Tổng người dùng"
                        value={stats?.totalUsers}
                        accent="from-emerald-500 to-green-500"
                        hint={`+${stats?.newUsersThisWeek || 0} tài khoản mới tuần này`}
                    />
                    <MetricCard
                        icon={MessageSquare}
                        title="Tổng nhóm chat"
                        value={stats?.totalGroups}
                        accent="from-cyan-500 to-sky-500"
                    />
                    <MetricCard
                        icon={Activity}
                        title="Tổng tin nhắn"
                        value={stats?.totalMessages}
                        accent="from-orange-500 to-amber-500"
                        hint={`${stats?.messagesLast24h || 0} trong 24h qua`}
                    />
                    <MetricCard
                        icon={UserPlus}
                        title="Đang hoạt động"
                        value={stats?.activeUsers}
                        accent="from-fuchsia-500 to-pink-500"
                    />
                </section>

                <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
                    <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                                Cơ cấu tài khoản
                            </h2>
                            <button
                                type="button"
                                onClick={fetchStats}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
                            >
                                Làm mới
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-rose-500" />
                                        Quản trị viên
                                    </div>
                                    <span>{stats?.adminCount || 0}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-200">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
                                        style={{
                                            width: `${toPercent(stats?.adminCount || 0, stats?.totalUsers || 0)}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <UserCog className="h-4 w-4 text-emerald-600" />
                                        Giảng viên
                                    </div>
                                    <span>{stats?.teacherCount || 0}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-200">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                        style={{
                                            width: `${toPercent(stats?.teacherCount || 0, stats?.totalUsers || 0)}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-cyan-600" />
                                        Sinh viên
                                    </div>
                                    <span>{stats?.studentCount || 0}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-200">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                        style={{
                                            width: `${toPercent(stats?.studentCount || 0, stats?.totalUsers || 0)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
                        <h2 className="mb-6 text-lg font-black text-slate-900 sm:text-xl">
                            Tình trạng hệ thống
                        </h2>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                                <p className="text-sm font-semibold text-emerald-800">
                                    Tài khoản hoạt động
                                </p>
                                <span className="text-lg font-black text-emerald-700">
                                    {stats?.activeUsers || 0}
                                </span>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4">
                                <p className="text-sm font-semibold text-red-800">
                                    Tài khoản bị khóa
                                </p>
                                <span className="text-lg font-black text-red-700">
                                    {stats?.blockedUsers || 0}
                                </span>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl bg-sky-50 p-4">
                                <p className="text-sm font-semibold text-sky-800">
                                    Tin nhắn trong 24h
                                </p>
                                <span className="text-lg font-black text-sky-700">
                                    {stats?.messagesLast24h || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
                    <h2 className="mb-5 text-lg font-black text-slate-900 sm:text-xl">
                        Thao tác nhanh
                    </h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {quickActions.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-4"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <ParallaxHoverCard className="shrink-0">
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.color}`}
                                        >
                                            <item.icon className="h-5 w-5 text-white" />
                                        </div>
                                    </ParallaxHoverCard>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-800 sm:text-base">
                                            {item.label}
                                        </p>
                                        <p className="truncate text-xs text-slate-500 sm:text-sm">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-700" />
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AdminDashboard;
