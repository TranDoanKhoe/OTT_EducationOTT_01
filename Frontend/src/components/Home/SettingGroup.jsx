import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    addGroupMembers,
    removeGroupMember,
    fetchGroupMembers,
} from '../../api/groupApi';
import { fetchFriendsList } from '../../api/user';

const SettingGroup = ({ open, onClose, groupId, token }) => {
    const [members, setMembers] = useState([]);
    const [friends, setFriends] = useState([]);

    useEffect(() => {
        if (open) {
            loadMembers();
            loadFriends();
        }
    }, [open]);

    const loadMembers = async () => {
        try {
            const fetched = await fetchGroupMembers(groupId, token);
            setMembers(fetched);
        } catch (error) {
            console.error('Lỗi tải thành viên:', error);
        }
    };

    const loadFriends = async () => {
        try {
            const fetched = await fetchFriendsList();
            setFriends(fetched);
        } catch (error) {
            console.error('Lỗi tải danh sách bạn bè:', error);
        }
    };

    const handleAddFriendToGroup = async (friendId) => {
        try {
            await addGroupMembers(groupId, [friendId], token);
            toast.success('Thêm thành viên thành công!');
            await loadMembers();
        } catch (error) {
            console.error('Lỗi khi thêm bạn:', error);
            toast.error('Không thể thêm thành viên.');
        }
    };

    const handleRemoveMember = async (userId) => {
        try {
            await removeGroupMember(groupId, userId, token);
            await loadMembers();
            toast.success('Đã xóa thành viên.');
        } catch (error) {
            console.error('Lỗi khi xóa thành viên:', error);
            toast.error('Không thể xóa thành viên.');
        }
    };

    // Kiểm tra xem một người dùng đã là thành viên của nhóm chưa
    const isMember = (userId) => {
        return members.some((member) => member.id === userId);
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Quản lý nhóm
                    </h2>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Current Members */}
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Thành viên hiện tại:
                    </h3>
                    <div className="space-y-2 mb-6">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2"
                            >
                                <img
                                    src={member.avatar || '/default-avatar.png'}
                                    alt={member.firstName}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {`${member.firstName} ${member.lastName}`}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {member.phone}
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        handleRemoveMember(member.id)
                                    }
                                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    Xóa
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Friends */}
                    <h3 className="text-sm font-medium text-gray-700 mb-3 mt-6">
                        Thêm từ danh sách bạn bè:
                    </h3>
                    <div className="space-y-2">
                        {friends.length === 0 ? (
                            <p className="text-sm text-gray-500 ml-2">
                                Không có bạn bè nào.
                            </p>
                        ) : (
                            friends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2"
                                >
                                    <img
                                        src={
                                            friend.avatar ||
                                            '/default-avatar.png'
                                        }
                                        alt={friend.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {friend.name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {friend.phone}
                                        </p>
                                    </div>
                                    {isMember(friend.id) ? (
                                        <span className="text-sm text-gray-500">
                                            Đã là thành viên
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                handleAddFriendToGroup(
                                                    friend.id,
                                                )
                                            }
                                            className="px-3 py-1 text-sm bg-[#0068ff] text-white rounded-lg hover:bg-[#0056d6] transition-colors"
                                        >
                                            Thêm
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-[#0068ff] text-white rounded-lg hover:bg-[#0056d6] transition-colors font-medium"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingGroup;
