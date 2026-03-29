import React from 'react';
import { updatePassword } from '../../api/user';
import { toast } from 'react-toastify';

// Password settings section belongs to the profile management flow.

const SettingsPanel = ({ open, onClose }) => {
    const handleUpdatePassword = async () => {
        const oldPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword =
            document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu mới không khớp');
            return;
        }

        const hasUpperCase = /[A-Z]/.test(newPassword);
        const isMaxLength = newPassword.length <= 10;

        if (!hasUpperCase || !isMaxLength) {
            toast.error(
                'Mật khẩu phải có ít nhất 1 ký tự in hoa và tối đa 10 ký tự',
            );
            return;
        }

        const result = await updatePassword(oldPassword, newPassword);
        if (result) {
            toast.success('Cập nhật mật khẩu thành công');
            onClose();
        } else {
            toast.error('Cập nhật mật khẩu thất bại');
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-8 transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-semibold mb-4">Đổi mật khẩu</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mật khẩu hiện tại
                        </label>
                        <input
                            type="password"
                            id="currentPassword"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mật khẩu mới
                        </label>
                        <input
                            type="password"
                            id="newPassword"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Xác nhận mật khẩu mới
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleUpdatePassword}
                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition"
                    >
                        Cập nhật
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
