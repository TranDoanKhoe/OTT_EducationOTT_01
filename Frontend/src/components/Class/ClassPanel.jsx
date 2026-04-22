import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    BiArrowBack,
    BiBookOpen,
    BiPlus,
    BiUserPlus,
    BiGroup,
    BiMessageSquareDetail,
    BiWifi,
    BiWifiOff,
} from 'react-icons/bi';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
    addGroupMembers,
    createClass,
    fetchClasses,
    fetchGroupMembers,
} from '../../api/groupApi';

const WS_URL = 'https://ott-education-be.onrender.com/ws';

const FALLBACK_AVATAR =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23E2E8F0"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%2364748B">U</text></svg>';

const ClassPanel = ({
    token,
    userId,
    contacts,
    onOpenClassChat,
    onRefreshGroups,
    onNotify,
    canManageClasses = false,
}) => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [members, setMembers] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [selectedAddMemberIds, setSelectedAddMemberIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [className, setClassName] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [isMobileView, setIsMobileView] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 1024;
    });
    const socketRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const friendContacts = useMemo(
        () => contacts.filter((contact) => !contact.isGroup),
        [contacts],
    );

    const studentClasses = useMemo(
        () =>
            contacts
                .filter((contact) => contact.isGroup && contact.isClass)
                .map((contact) => ({
                    id: contact.id,
                    name: contact.name,
                    createId: contact.createId,
                    roles: contact.roles,
                    classCode: contact.classCode,
                    avatarGroup: contact.avatar,
                    groupType: 'CLASS',
                })),
        [contacts],
    );

    const contactNameById = useMemo(() => {
        const map = new Map();
        contacts
            .filter((contact) => !contact.isGroup)
            .forEach((contact) => {
                if (contact?.id) {
                    map.set(contact.id, contact.name || contact.username);
                }
            });
        return map;
    }, [contacts]);

    const memberNameById = useMemo(() => {
        const map = new Map();
        (members || []).forEach((member) => {
            if (!member?.id) return;
            const fullName =
                member.name ||
                `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                member.username ||
                member.email ||
                null;
            if (fullName) {
                map.set(member.id, fullName);
            }
        });
        return map;
    }, [members]);

    const resolveCreatorId = useCallback((item) => {
        if (item?.createId) return item.createId;
        const roles = item?.roles || {};
        const creatorEntry = Object.entries(roles).find(
            ([, role]) => String(role).toUpperCase() === 'ADMIN',
        );
        return creatorEntry?.[0] || null;
    }, []);

    const creatorDisplay = useMemo(() => {
        const creatorId = resolveCreatorId(selectedClass);
        if (!creatorId) return 'Chưa cập nhật';
        return (
            memberNameById.get(creatorId) ||
            contactNameById.get(creatorId) ||
            creatorId
        );
    }, [memberNameById, contactNameById, resolveCreatorId, selectedClass]);

    const visibleClasses = useMemo(() => {
        const source = canManageClasses ? classes : studentClasses;
        const keyword = searchKeyword.trim().toLowerCase();
        if (!keyword) return source;
        return source.filter((item) =>
            (item?.name || '').toLowerCase().includes(keyword),
        );
    }, [canManageClasses, classes, searchKeyword, studentClasses]);

    const loadClasses = useCallback(
        async (keyword = '') => {
            if (!token) return;
            try {
                setIsLoading(true);
                const data = await fetchClasses(token, keyword);
                setClasses(data || []);
                setSelectedClass(
                    (prev) => prev || (data?.length ? data[0] : null),
                );
            } catch (error) {
                onNotify?.(
                    'Lỗi tải danh sách lớp: ' +
                        (error.response?.data?.message || error.message),
                    'error',
                );
            } finally {
                setIsLoading(false);
            }
        },
        [onNotify, token],
    );

    const loadClassMembers = useCallback(
        async (classId) => {
            if (!token || !classId) return;
            try {
                const data = await fetchGroupMembers(classId, token);
                setMembers(data || []);
            } catch (error) {
                setMembers([]);
                onNotify?.(
                    'Lỗi tải thành viên lớp: ' +
                        (error.response?.data?.message || error.message),
                    'error',
                );
            }
        },
        [onNotify, token],
    );

    useEffect(() => {
        if (canManageClasses) {
            loadClasses();
            return;
        }
        setClasses([]);
    }, [canManageClasses, loadClasses]);

    useEffect(() => {
        setSelectedClass((prev) => {
            if (!visibleClasses.length) return null;
            if (prev && visibleClasses.some((item) => item.id === prev.id)) {
                return prev;
            }
            return visibleClasses[0];
        });
    }, [visibleClasses]);

    useEffect(() => {
        if (!canManageClasses) {
            setMembers([]);
            return;
        }
        loadClassMembers(selectedClass?.id);
    }, [canManageClasses, loadClassMembers, selectedClass?.id]);

    useEffect(() => {
        if (!token || !userId) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
                userId,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        socketRef.current = client;

        const refreshClassData = async () => {
            if (canManageClasses) {
                await loadClasses(searchKeyword.trim());
                if (selectedClass?.id) {
                    await loadClassMembers(selectedClass.id);
                }
            }
            await onRefreshGroups?.();
        };

        client.onConnect = () => {
            setWsConnected(true);

            const subscribe = (destination) => {
                client.subscribe(
                    destination,
                    async (message) => {
                        try {
                            const payload = JSON.parse(message.body || '{}');
                            const groupPayload =
                                payload?.group || payload || {};
                            const groupType =
                                groupPayload.groupType ||
                                payload?.groupType ||
                                null;
                            if (groupType === 'CLASS' || !groupType) {
                                await refreshClassData();
                            }
                        } catch {
                            await refreshClassData();
                        }
                    },
                    { Authorization: `Bearer ${token}` },
                );
            };

            subscribe(`/user/${userId}/queue/group/create`);
            subscribe(`/user/${userId}/queue/group/updated`);
            subscribe(`/user/${userId}/queue/group/delete`);
            subscribe(`/user/${userId}/queue/group/invite`);
        };

        client.onWebSocketClose = () => {
            setWsConnected(false);
        };

        client.onStompError = () => {
            setWsConnected(false);
        };

        client.activate();

        return () => {
            setWsConnected(false);
            if (socketRef.current) {
                socketRef.current.deactivate();
                socketRef.current = null;
            }
        };
    }, [
        canManageClasses,
        loadClassMembers,
        loadClasses,
        onRefreshGroups,
        searchKeyword,
        selectedClass?.id,
        token,
        userId,
    ]);

    const handleSearchClass = async (e) => {
        e.preventDefault();
        if (!canManageClasses) {
            return;
        }
        await loadClasses(searchKeyword.trim());
    };

    const handleCreateClass = async () => {
        if (!canManageClasses) {
            onNotify?.(
                'Chỉ tài khoản Teacher mới dùng được chức năng lớp học',
                'warning',
            );
            return;
        }

        if (!className.trim()) {
            onNotify?.('Vui lòng nhập tên lớp', 'warning');
            return;
        }

        try {
            setIsLoading(true);
            const result = await createClass(
                className.trim(),
                [...new Set([...selectedMemberIds, userId])],
                null,
                token,
            );

            setCreateOpen(false);
            setClassName('');
            setSelectedMemberIds([]);
            await loadClasses();
            await onRefreshGroups?.();

            if (result?.id) {
                setSelectedClass(result);
            }

            onNotify?.('Tạo lớp thành công', 'success');
        } catch (error) {
            onNotify?.(
                'Tạo lớp thất bại: ' +
                    (error.response?.data?.message || error.message),
                'error',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMembersToClass = async () => {
        if (!canManageClasses) {
            onNotify?.(
                'Chỉ tài khoản Teacher mới dùng được chức năng lớp học',
                'warning',
            );
            return;
        }

        if (!selectedClass?.id) {
            onNotify?.(
                'Vui lòng chọn lớp trước khi thêm thành viên',
                'warning',
            );
            return;
        }

        if (selectedAddMemberIds.length === 0) {
            onNotify?.(
                'Vui lòng chọn ít nhất một thành viên để thêm',
                'warning',
            );
            return;
        }

        try {
            setIsLoading(true);
            const updatedClass = await addGroupMembers(
                selectedClass.id,
                selectedAddMemberIds,
                token,
            );
            await loadClasses();
            await onRefreshGroups?.();
            await loadClassMembers(selectedClass.id);
            setSelectedAddMemberIds([]);
            if (updatedClass?.id) {
                setSelectedClass(updatedClass);
            }
            onNotify?.('Đã thêm thành viên vào lớp', 'success');
            setAddMemberOpen(false);
        } catch (error) {
            onNotify?.(
                'Không thể thêm thành viên: ' +
                    (error.response?.data?.message || error.message),
                'error',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAddMemberForm = () => {
        if (!canManageClasses) {
            onNotify?.(
                'Chỉ tài khoản Teacher mới dùng được chức năng lớp học',
                'warning',
            );
            return;
        }

        if (!selectedClass?.id) {
            onNotify?.(
                'Vui lòng chọn lớp trước khi thêm thành viên',
                'warning',
            );
            return;
        }

        setSelectedAddMemberIds([]);
        setAddMemberOpen(true);
    };

    const candidateMembers = useMemo(() => {
        if (!selectedClass?.memberIds) return friendContacts;
        const inClass = new Set(selectedClass.memberIds);
        return friendContacts.filter((friend) => !inClass.has(friend.id));
    }, [friendContacts, selectedClass?.memberIds]);

    const showClassList = !isMobileView || !selectedClass;
    const showClassDetails = !isMobileView || Boolean(selectedClass);

    return (
        <div className="flex flex-col lg:flex-row flex-1 min-w-0 bg-slate-50">
            <div
                className={`${
                    showClassList ? 'flex' : 'hidden'
                } w-full lg:w-[360px] border-r border-slate-200 bg-white flex-col`}
            >
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BiBookOpen className="text-emerald-600" />
                            Lớp học
                        </h2>
                        <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                wsConnected
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                            }`}
                        >
                            {wsConnected ? <BiWifi /> : <BiWifiOff />}
                            {wsConnected ? 'Realtime' : 'Offline'}
                        </span>
                        {canManageClasses && (
                            <button
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                <BiPlus /> Tạo
                            </button>
                        )}
                    </div>

                    <form
                        onSubmit={handleSearchClass}
                        className="flex gap-2 mb-2"
                    >
                        <input
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="Tìm lớp theo tên"
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        <button
                            type="submit"
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-100"
                        >
                            Tìm
                        </button>
                    </form>

                    {canManageClasses && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleOpenAddMemberForm}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700"
                            >
                                <BiUserPlus /> Join
                            </button>
                            <span className="text-xs text-slate-500 self-center">
                                Dùng để thêm thành viên vào lớp đã chọn
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading &&
                    canManageClasses &&
                    visibleClasses.length === 0 ? (
                        <p className="text-sm text-slate-500 p-4">
                            Đang tải lớp...
                        </p>
                    ) : visibleClasses.length === 0 ? (
                        <p className="text-sm text-slate-500 p-4">
                            Chưa có lớp nào.
                        </p>
                    ) : (
                        visibleClasses.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setSelectedClass(item);
                                }}
                                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                                    selectedClass?.id === item.id
                                        ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                                        : ''
                                }`}
                            >
                                <p className="font-semibold text-slate-800 truncate">
                                    {item.name}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Mã lớp: {item.classCode || item.id}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div
                className={`${
                    showClassDetails ? 'block' : 'hidden'
                } flex-1 p-4 sm:p-6 overflow-auto`}
            >
                {!selectedClass ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                                <BiBookOpen size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">
                                Chưa có lớp nào được chọn
                            </h3>
                            <p className="text-sm text-slate-500">
                                {canManageClasses
                                    ? 'Tạo lớp mới hoặc chọn một lớp ở danh sách bên trái để xem chi tiết.'
                                    : 'Bạn sẽ thấy lớp học tại đây khi được giảng viên thêm vào lớp.'}
                            </p>
                            {canManageClasses && (
                                <button
                                    onClick={() => setCreateOpen(true)}
                                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                                >
                                    <BiPlus /> Tạo lớp mới
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-5">
                        {isMobileView && (
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="tap-target mb-1 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                title="Quay lại danh sách lớp"
                            >
                                <BiArrowBack size={20} />
                            </button>
                        )}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">
                                        {selectedClass.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Mã lớp:{' '}
                                        {selectedClass.classCode ||
                                            selectedClass.id}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        Giảng viên/Người tạo: {creatorDisplay}
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        onOpenClassChat?.({
                                            ...selectedClass,
                                            isGroup: true,
                                            isClass: true,
                                            avatar:
                                                selectedClass.avatarGroup ||
                                                'https://th.bing.com/th/id/R.0fb6fad84621ac768796c2c228858678?rik=EZHn72rbvK8jkg&pid=ImgRaw&r=0',
                                        })
                                    }
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                                >
                                    <BiMessageSquareDetail /> Mở chat lớp
                                </button>
                            </div>
                        </div>

                        {canManageClasses && (
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <BiGroup className="text-cyan-700" /> Thành
                                    viên lớp ({members.length})
                                </h4>
                                {members.length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                        Chưa có thành viên hoặc chưa tải được dữ
                                        liệu.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {members.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg"
                                            >
                                                <img
                                                    src={
                                                        member.avatar ||
                                                        FALLBACK_AVATAR
                                                    }
                                                    alt={
                                                        member.name ||
                                                        member.firstName ||
                                                        'User'
                                                    }
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror =
                                                            null;
                                                        e.currentTarget.src =
                                                            FALLBACK_AVATAR;
                                                    }}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">
                                                        {member.name ||
                                                            `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                                                            member.username ||
                                                            'Người dùng'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {member.email ||
                                                            member.id}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {canManageClasses && createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setCreateOpen(false)}
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">
                                Tạo lớp mới
                            </h3>
                        </div>
                        <div className="p-5">
                            <label className="text-sm font-medium text-slate-700">
                                Tên lớp
                            </label>
                            <input
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                placeholder="Ví dụ: Lập trình Java nâng cao"
                                className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />

                            <p className="mt-4 text-sm font-medium text-slate-700">
                                Thêm thành viên ban đầu
                            </p>
                            <div className="mt-2 max-h-56 overflow-auto border border-slate-200 rounded-lg">
                                {friendContacts.map((friend) => (
                                    <label
                                        key={friend.id}
                                        className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 last:border-b-0"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMemberIds.includes(
                                                friend.id,
                                            )}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedMemberIds(
                                                        (prev) => [
                                                            ...prev,
                                                            friend.id,
                                                        ],
                                                    );
                                                } else {
                                                    setSelectedMemberIds(
                                                        (prev) =>
                                                            prev.filter(
                                                                (id) =>
                                                                    id !==
                                                                    friend.id,
                                                            ),
                                                    );
                                                }
                                            }}
                                        />
                                        <span className="text-sm text-slate-700">
                                            {friend.name}
                                        </span>
                                    </label>
                                ))}
                                {friendContacts.length === 0 && (
                                    <p className="text-sm text-slate-500 p-3">
                                        Bạn chưa có bạn bè để thêm.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setCreateOpen(false)}
                                className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-100"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateClass}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {isLoading ? 'Đang tạo...' : 'Tạo lớp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {canManageClasses && addMemberOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setAddMemberOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">
                                Thêm thành viên vào lớp
                            </h3>
                        </div>
                        <div className="p-5">
                            {candidateMembers.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Không còn bạn bè nào để thêm vào lớp này.
                                </p>
                            ) : (
                                <div className="max-h-72 overflow-auto border border-slate-200 rounded-lg">
                                    {candidateMembers.map((friend) => (
                                        <label
                                            key={friend.id}
                                            className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 last:border-b-0"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAddMemberIds.includes(
                                                    friend.id,
                                                )}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedAddMemberIds(
                                                            (prev) => [
                                                                ...prev,
                                                                friend.id,
                                                            ],
                                                        );
                                                    } else {
                                                        setSelectedAddMemberIds(
                                                            (prev) =>
                                                                prev.filter(
                                                                    (id) =>
                                                                        id !==
                                                                        friend.id,
                                                                ),
                                                        );
                                                    }
                                                }}
                                            />
                                            <span className="text-sm text-slate-700">
                                                {friend.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setAddMemberOpen(false)}
                                className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-100"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddMembersToClass}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-60"
                            >
                                {isLoading ? 'Đang thêm...' : 'Xác nhận thêm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassPanel;
