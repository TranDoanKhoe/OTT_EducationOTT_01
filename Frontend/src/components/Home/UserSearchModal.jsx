import React, { useState } from 'react';
import { BiSearch, BiUserPlus, BiX } from 'react-icons/bi';
import {
    sendFriendRequest,
    fetchUserByPhone,
    fetchFriendsList,
} from '../../api/user';
import { toast } from 'react-toastify';

const UserSearchModal = ({ open, onClose }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [resultMessage, setResultMessage] = useState({
        type: '',
        message: '',
    });
    const [userFound, setUserFound] = useState(null);
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');

    const handleSearch = async () => {
        if (!phoneNumber.trim()) {
            setResultMessage({
                type: 'error',
                message: 'Vui lòng nhập số điện thoại để tìm kiếm',
            });
            return;
        }

        setIsLoading(true);
        setSearchPerformed(true);

        try {
            const userData = await fetchUserByPhone(phoneNumber);
            console.log('User data from API:', userData); // Debug

            if (userData) {
                // Kiểm tra friendStatus từ API hoặc gọi API riêng để check
                let friendStatus = userData.friendStatus || 'NONE';

                // Nếu API không trả friendStatus, check thủ công
                if (!userData.friendStatus) {
                    try {
                        const friendsList = await fetchFriendsList(token);
                        const isFriend = friendsList?.some(
                            (friend) => friend.id === userData.id,
                        );
                        if (isFriend) {
                            friendStatus = 'FRIEND';
                        }
                    } catch (err) {
                        console.error('Error checking friend status:', err);
                    }
                }

                // Ánh xạ dữ liệu từ API vào cấu trúc frontend cần
                const fullName =
                    userData.name ||
                    `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                    userData.username ||
                    userData.phone;
                setUserFound({
                    id: userData.id,
                    name: fullName,
                    phone: userData.phone,
                    avatar:
                        userData.avatar ||
                        'https://i.pravatar.cc/150?img=' +
                            Math.floor(Math.random() * 70),
                    friendStatus: friendStatus,
                });
                setResultMessage({
                    type: 'success',
                    message: 'Đã tìm thấy người dùng!',
                });
            } else {
                setResultMessage({
                    type: 'error',
                    message: 'Không tìm thấy người dùng!',
                });
                setUserFound(null);
            }
        } catch (error) {
            console.error('Error searching for user:', error);
            setResultMessage({
                type: 'error',
                message:
                    error.message ||
                    'Không thể tìm thấy người dùng với số điện thoại này',
            });
            setUserFound(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendFriendRequest = async () => {
        if (!phoneNumber.trim()) {
            toast.error('Số điện thoại không hợp lệ');
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendFriendRequest(phoneNumber);
            if (result) {
                toast.success('Đã gửi lời mời kết bạn thành công!');
                // Reset search after successful friend request
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                toast.error('Gửi lời mời kết bạn thất bại!');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            toast.error(
                error.message || 'Có lỗi xảy ra khi gửi lời mời kết bạn',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">Tìm kiếm bạn bè</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition"
                    >
                        <BiX size={24} />
                    </button>
                </div>

                <div className="p-4">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                            Nhập số điện thoại để tìm kiếm người dùng
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nhập số điện thoại..."
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isLoading || !phoneNumber.trim()}
                                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <BiSearch size={20} />
                                Tìm
                            </button>
                        </div>
                    </div>

                    {isLoading && (
                        <div className="flex justify-center my-6">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                    )}

                    {searchPerformed && !isLoading && (
                        <>
                            {resultMessage.type && (
                                <div
                                    className={`p-3 rounded-lg mb-4 ${
                                        resultMessage.type === 'success'
                                            ? 'bg-green-50 text-green-800 border border-green-200'
                                            : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}
                                >
                                    {resultMessage.message}
                                </div>
                            )}

                            {userFound && (
                                <div className="mt-4 p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {userFound.avatar ? (
                                            <img
                                                src={userFound.avatar}
                                                alt={userFound.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                                                {userFound.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium">
                                                {userFound.name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {userFound.phone}
                                            </p>
                                        </div>
                                    </div>
                                    {userFound.friendStatus === 'FRIEND' ? (
                                        <span className="text-sm font-semibold text-green-600">
                                            Đã là bạn bè
                                        </span>
                                    ) : userFound.friendStatus === 'PENDING' ? (
                                        <span className="text-sm font-semibold text-amber-600">
                                            Đã gửi lời mời
                                        </span>
                                    ) : (
                                        <button
                                            onClick={handleSendFriendRequest}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <BiUserPlus size={18} />
                                            Kết bạn
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-end p-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserSearchModal;
