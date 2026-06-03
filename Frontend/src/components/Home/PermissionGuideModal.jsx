import { BiLock, BiCamera, BiMicrophone } from 'react-icons/bi';

const PermissionGuideModal = ({ open, onClose, onRetry }) => {
    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={onClose}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Dialog Title */}
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <BiLock size={28} />
                            <h2 className="text-xl font-semibold">
                                Cần quyền truy cập Microphone/Camera
                            </h2>
                        </div>

                        {/* Dialog Content */}
                        <div>
                            <p className="mb-4">
                                Để thực hiện cuộc gọi, bạn cần cho phép ứng dụng
                                truy cập microphone và camera của bạn.
                            </p>

                            <div className="p-4 bg-gray-100 rounded-lg mb-3">
                                <h3 className="text-sm font-semibold mb-2">
                                    Bước 1: Tìm icon ổ khóa
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Nhìn lên thanh địa chỉ URL của trình duyệt,
                                    bạn sẽ thấy icon ổ khóa 🔒 hoặc 🛈 bên trái
                                    URL
                                </p>
                            </div>

                            <div className="p-4 bg-gray-100 rounded-lg mb-3">
                                <h3 className="text-sm font-semibold mb-2">
                                    Bước 2: Click vào icon
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Click vào icon đó để mở menu cài đặt quyền
                                </p>
                            </div>

                            <div className="p-4 bg-gray-100 rounded-lg mb-3">
                                <h3 className="text-sm font-semibold mb-2">
                                    Bước 3: Cho phép quyền
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                    Tìm và bật quyền cho:
                                </p>
                                <div className="ml-2 mt-1">
                                    <div className="flex items-center gap-1 mb-1">
                                        <BiMicrophone size={18} />
                                        <span className="text-sm">
                                            Microphone (Bắt buộc)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <BiCamera size={18} />
                                        <span className="text-sm">
                                            Camera (Cho cuộc gọi video)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-100 rounded-lg mb-3">
                                <h3 className="text-sm font-semibold mb-2">
                                    Bước 4: Thử lại
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Sau khi cho phép, click nút "Thử lại" bên
                                    dưới
                                </p>
                            </div>

                            <div className="mt-4 p-2 bg-yellow-50 rounded">
                                <p className="text-xs text-gray-600">
                                    💡 <strong>Lưu ý:</strong> Nếu không thấy
                                    tùy chọn, hãy thử refresh trang (F5) và làm
                                    lại từ đầu.
                                </p>
                            </div>
                        </div>

                        {/* Dialog Actions */}
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 bg-[#0068ff] text-white rounded hover:bg-[#0056d6] transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PermissionGuideModal;
