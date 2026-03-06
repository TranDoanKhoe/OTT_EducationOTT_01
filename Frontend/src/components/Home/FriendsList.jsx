import React, { useMemo, useRef, useState } from 'react';
import {
    BiUserPlus,
    BiPhone,
    BiVideo,
    BiChat,
    BiSearch,
    BiSortAlt2,
    BiUserX,
} from 'react-icons/bi';

const FriendsList = ({
    contacts,
    onSelectContact,
    onOpenUserSearch,
    onStartCall,
    onRemoveFriend,
    hideHeader = false,
}) => {
    // Filter only friends (not groups)
    const friends = contacts.filter((contact) => !contact.isGroup);
    const listRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState(0); // 0: Tất cả, 1: A-Z
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' = A-Z, 'desc' = Z-A

    // Sắp xếp và phân nhóm bạn bè
    const { sortedFriends, onlineFriends, groupedByAlphabet } = useMemo(() => {
        // Lọc theo search query
        let filtered = friends;
        if (searchQuery.trim()) {
            filtered = friends.filter((f) =>
                (f.name || '')
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
            );
        }

        // Tách online và offline
        const online = filtered.filter((f) => f.status === 'online');
        const offline = filtered.filter((f) => f.status !== 'online');

        // Sắp xếp theo alphabet
        const sortByName = (a, b) => {
            const comparison = (a.name || '').localeCompare(b.name || '');
            return sortDirection === 'asc' ? comparison : -comparison;
        };
        online.sort(sortByName);
        offline.sort(sortByName);

        // Gộp lại: online trước, offline sau
        const sorted = [...online, ...offline];

        // Nhóm theo chữ cái đầu
        const grouped = {};
        sorted.forEach((friend) => {
            const firstChar = (friend.name || '?').charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
            if (!grouped[letter]) {
                grouped[letter] = [];
            }
            grouped[letter].push(friend);
        });

        return {
            sortedFriends: sorted,
            onlineFriends: online,
            groupedByAlphabet: grouped,
        };
    }, [friends, searchQuery, filterTab, sortDirection]);

    // Danh sách các chữ cái có bạn bè
    const alphabetList = Object.keys(groupedByAlphabet).sort();

    const scrollToLetter = (letter) => {
        const element = document.getElementById(`letter-${letter}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleFriendClick = (friend) => {
        if (onSelectContact) {
            onSelectContact(friend);
        }
    };

    const handleStartCall = (friend, isVideo) => {
        // Select friend first, then trigger call
        if (onSelectContact) {
            onSelectContact(friend);
        }
        if (onStartCall) {
            // Wait a bit for selection to process
            setTimeout(() => {
                onStartCall(friend, isVideo);
            }, 100);
        }
    };

    return (
        <div className="flex flex-col h-full relative bg-white">
            {!hideHeader && (
                <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">
                            Danh sách bạn bè
                        </h2>
                        <div className="flex gap-2 items-center">
                            {filterTab === 1 && (
                                <button
                                    onClick={() =>
                                        setSortDirection((prev) =>
                                            prev === 'asc' ? 'desc' : 'asc',
                                        )
                                    }
                                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                                    title={
                                        sortDirection === 'asc'
                                            ? 'Sắp xếp Z-A'
                                            : 'Sắp xếp A-Z'
                                    }
                                >
                                    <BiSortAlt2 size={18} />
                                    <span className="text-xs font-semibold">
                                        {sortDirection === 'asc'
                                            ? 'A-Z'
                                            : 'Z-A'}
                                    </span>
                                </button>
                            )}
                            {onlineFriends.length > 0 && (
                                <span className="px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-semibold">
                                    {onlineFriends.length} online
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Thanh tìm kiếm */}
                    <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 mb-4">
                        <BiSearch size={18} className="text-gray-500" />
                        <input
                            type="text"
                            placeholder="Tìm tên bạn bè..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ml-2 flex-1 bg-transparent outline-none text-sm"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setFilterTab(0)}
                            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                                filterTab === 0
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setFilterTab(1)}
                            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                                filterTab === 1
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            A-Z
                        </button>
                    </div>
                </div>
            )}

            <div ref={listRef} className="flex-1 overflow-y-auto">
                {sortedFriends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 py-16">
                        <BiUserPlus size={64} className="text-gray-300" />
                        <p className="mt-4 text-base">
                            {searchQuery
                                ? 'Không tìm thấy bạn bè'
                                : 'Chưa có bạn bè'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={onOpenUserSearch}
                                className="mt-2 text-sm text-primary hover:underline cursor-pointer"
                            >
                                Thêm bạn bè ngay
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        {/* Tab Tất cả: hiển thị danh sách bình thường */}
                        {filterTab === 0 &&
                            sortedFriends.map((friend) => (
                                <React.Fragment key={friend.id}>
                                    <div className="group flex items-center p-4 cursor-pointer hover:bg-gray-50 transition">
                                        <div className="relative mr-3">
                                            {friend.avatar ? (
                                                <img
                                                    src={friend.avatar}
                                                    alt={friend.name}
                                                    className="w-14 h-14 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                                                    {friend.name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-base truncate">
                                                {friend.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {friend.status === 'online' ? (
                                                    <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-primary">
                                                        Đang hoạt động
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-500">
                                                        {friend.lastSeen
                                                            ? `Hoạt động ${new Date(
                                                                  friend.lastSeen,
                                                              ).toLocaleDateString()}`
                                                            : 'Không hoạt động'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFriendClick(friend);
                                                }}
                                                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                            >
                                                <BiChat size={18} />
                                            </button>
                                            {!friend.isGroup && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartCall(
                                                                friend,
                                                                false,
                                                            );
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                                        title="Gọi thoại"
                                                    >
                                                        <BiPhone size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartCall(
                                                                friend,
                                                                true,
                                                            );
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                                        title="Gọi video"
                                                    >
                                                        <BiVideo size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveFriend?.(
                                                                friend,
                                                            );
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition"
                                                        title="Hủy kết bạn"
                                                    >
                                                        <BiUserX size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="border-b border-gray-200 ml-20" />
                                </React.Fragment>
                            ))}

                        {/* Tab A-Z: hiển thị nhóm theo chữ cái */}
                        {filterTab === 1 &&
                            alphabetList.map((letter) => (
                                <React.Fragment key={letter}>
                                    {/* Header chữ cái */}
                                    <div
                                        id={`letter-${letter}`}
                                        className="sticky top-0 bg-gray-50 px-6 py-3 z-10 border-b border-gray-200"
                                    >
                                        <h3 className="text-sm font-bold text-primary">
                                            {letter}
                                        </h3>
                                    </div>
                                    {/* Danh sách bạn bè trong nhóm */}
                                    {groupedByAlphabet[letter].map((friend) => (
                                        <React.Fragment key={friend.id}>
                                            <div className="group flex items-center p-4 cursor-pointer hover:bg-gray-50 transition">
                                                <div className="relative mr-3">
                                                    {friend.avatar ? (
                                                        <img
                                                            src={friend.avatar}
                                                            alt={friend.name}
                                                            className="w-14 h-14 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                                                            {friend.name?.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-base truncate">
                                                        {friend.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {friend.status ===
                                                        'online' ? (
                                                            <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-primary">
                                                                Đang hoạt động
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">
                                                                {friend.lastSeen
                                                                    ? `Hoạt động ${new Date(
                                                                          friend.lastSeen,
                                                                      ).toLocaleDateString()}`
                                                                    : 'Không hoạt động'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFriendClick(
                                                                friend,
                                                            );
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                                    >
                                                        <BiChat size={18} />
                                                    </button>
                                                    {!friend.isGroup && (
                                                        <>
                                                            <button
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleStartCall(
                                                                        friend,
                                                                        false,
                                                                    );
                                                                }}
                                                                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                                                title="Gọi thoại"
                                                            >
                                                                <BiPhone
                                                                    size={18}
                                                                />
                                                            </button>
                                                            <button
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleStartCall(
                                                                        friend,
                                                                        true,
                                                                    );
                                                                }}
                                                                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                                                title="Gọi video"
                                                            >
                                                                <BiVideo
                                                                    size={18}
                                                                />
                                                            </button>
                                                            <button
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    onRemoveFriend?.(
                                                                        friend,
                                                                    );
                                                                }}
                                                                className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition"
                                                                title="Hủy kết bạn"
                                                            >
                                                                <BiUserX
                                                                    size={18}
                                                                />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="border-b border-gray-200" />
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                    </div>
                )}
            </div>

            {/* Alphabet Index - thanh cuộn nhanh bên phải - chỉ hiển thị ở tab A-Z */}
            {filterTab === 1 && sortedFriends.length > 10 && (
                <div
                    className="absolute right-2 flex flex-col items-center gap-0.5 py-3 px-2 bg-white/95 rounded-2xl shadow-md z-10"
                    style={{
                        top: hideHeader ? '50%' : 'calc(50% + 100px)',
                        transform: 'translateY(-50%)',
                    }}
                >
                    {alphabetList.map((letter) => (
                        <button
                            key={letter}
                            onClick={() => scrollToLetter(letter)}
                            className="w-6 h-6 flex items-center justify-center cursor-pointer text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white hover:rounded-full hover:scale-110"
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FriendsList;
