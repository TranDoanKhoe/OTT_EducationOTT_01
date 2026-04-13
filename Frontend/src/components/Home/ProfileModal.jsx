import React, { useState } from 'react';
import UpdateProfileForm from './UpdateProfileForm';
import { updateUserProfile } from '../../api/user';
import { BiCamera } from 'react-icons/bi';
import { toast } from 'react-toastify';

const getGenderLabel = (gender) => {
    switch (gender) {
        case 'MALE':
            return 'Nam';
        case 'FEMALE':
            return 'Nữ';
        default:
            return 'Khác';
    }
};

const ProfileModal = ({
    open,
    onClose,
    profileData,
    userProfile,
    setUserProfile,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isAvatarZoomed, setIsAvatarZoomed] = useState(false);

    const handleProfileUpdate = async (event, formData) => {
        event.preventDefault();
        setLoading(true);

        try {
            const avatarFile = document.getElementById('profile-image-upload')
                ?.files[0];

            if (!avatarFile) {
                console.warn('No avatar file selected');
            }

            const updatedProfile = {
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                email: userProfile.email,
                phone: userProfile.phone,
                gender: formData.get('gender'),
                birthday: formData.get('birthday'),
                avatar: avatarFile,
            };

            const result = await updateUserProfile(updatedProfile);

            if (result) {
                setUserProfile(result);
                setIsEditing(false);
                toast.success('Cập nhật hồ sơ thành công!');
                onClose();
            } else {
                toast.error('Cập nhật hồ sơ thất bại.');
            }
        } catch (error) {
            console.error('Update profile failed:', error);
            toast.error('Có lỗi xảy ra khi cập nhật hồ sơ.');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setLoading(true);
            try {
                const updatedProfile = {
                    firstName: userProfile.firstName,
                    lastName: userProfile.lastName,
                    email: userProfile.email,
                    phone: userProfile.phone,
                    gender: userProfile.gender,
                    birthday: userProfile.birthday,
                    avatar: file,
                };
                const result = await updateUserProfile(updatedProfile);
                if (result) {
                    setUserProfile(result);
                    toast.success('Cập nhật ảnh đại diện thành công!');
                } else {
                    toast.error('Cập nhật ảnh đại diện thất bại.');
                }
            } catch (error) {
                console.error('Avatar upload failed:', error);
                toast.error('Có lỗi khi tải ảnh đại diện.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAvatarClick = () => {
        setIsAvatarZoomed(true);
    };

    const handleCloseZoom = () => {
        setIsAvatarZoomed(false);
    };

    const renderProfileContent = () => {
        const data = userProfile || profileData;
        if (!data) return null;

        return (
            <div className="flex flex-col items-center gap-4">
                <div className="relative inline-block">
                    <div className="relative inline-block">
                        {data.avatar ? (
                            <img
                                src={data.avatar}
                                alt="Avatar"
                                className="w-36 h-36 rounded-full object-cover cursor-pointer border-4 border-primary transition-all hover:opacity-90 hover:scale-105"
                                onClick={handleAvatarClick}
                            />
                        ) : (
                            <div
                                className="w-36 h-36 rounded-full bg-blue-500 flex items-center justify-center text-white text-5xl font-semibold cursor-pointer border-4 border-primary transition-all hover:opacity-90 hover:scale-105"
                                onClick={handleAvatarClick}
                            >
                                {data.firstName?.charAt(0) || '?'}
                            </div>
                        )}
                        {loading && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        )}
                    </div>

                    {userProfile && (
                        <button
                            onClick={() =>
                                document
                                    .getElementById('profile-image-upload')
                                    ?.click()
                            }
                            className="absolute bottom-2 right-2 bg-white/80 rounded-full p-2 cursor-pointer flex items-center justify-center shadow hover:bg-white transition"
                        >
                            <BiCamera size={20} className="text-primary" />
                        </button>
                    )}
                </div>

                <input
                    type="file"
                    id="profile-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                />

                <h2 className="text-3xl font-bold text-gray-900">
                    {`${data.firstName || ''} ${data.lastName || ''}`.trim() ||
                        'N/A'}
                </h2>
                <p className="text-sm text-gray-500">
                    Trạng thái: {data.status || 'Không xác định'}
                </p>

                <div className="border-t border-gray-200 my-6 w-full"></div>

                <div className="w-full text-left px-4 space-y-3">
                    <p className="text-base">
                        <strong>Email:</strong> {data.email || 'N/A'}
                    </p>
                    <p className="text-base">
                        <strong>Họ và Tên:</strong>{' '}
                        {`${data.firstName || ''} ${data.lastName || ''}`.trim() ||
                            'N/A'}
                    </p>
                    <p className="text-base">
                        <strong>Ngày sinh:</strong>{' '}
                        {data.birthday
                            ? new Date(data.birthday).toLocaleDateString(
                                  'vi-VN',
                              )
                            : 'N/A'}
                    </p>
                    <p className="text-base">
                        <strong>Giới tính:</strong>{' '}
                        {getGenderLabel(data.gender)}
                    </p>
                    <p className="text-base">
                        <strong>Số điện thoại:</strong> {data.phone || 'N/A'}
                    </p>
                </div>

                {userProfile && (
                    <div className="w-full mt-6">
                        {isEditing ? (
                            <UpdateProfileForm
                                profileData={data}
                                onSubmit={handleProfileUpdate}
                                onCancel={() => setIsEditing(false)}
                            />
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                disabled={loading}
                                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    </div>
                                ) : (
                                    'Chỉnh sửa hồ sơ'
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={onClose}
            >
                <div
                    className="relative w-full max-w-[96vw] sm:max-w-[90vw] md:max-w-[450px] max-h-[90vh] overflow-y-auto bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {renderProfileContent()}
                </div>
            </div>

            {isAvatarZoomed && (
                <div
                    onClick={handleCloseZoom}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] cursor-zoom-out"
                >
                    <img
                        src={userProfile?.avatar || profileData?.avatar}
                        alt="Ảnh đại diện phóng to"
                        className="max-w-[90%] max-h-[90%] object-contain"
                    />
                </div>
            )}
        </>
    );
};

export default ProfileModal;
