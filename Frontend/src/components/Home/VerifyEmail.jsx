import React, { useState } from 'react';
import { sendVerificationEmail, verifyEmailWithCode } from '../api/user';
import { useNavigate } from 'react-router-dom';

const VerifyEmail = ({ email, registerData, onSuccess, onBack }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [codeSent, setCodeSent] = useState(false);
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Gửi mã xác thực đến email
    const handleSendCode = async () => {
        setLoading(true);
        setError(null);
        try {
            await sendVerificationEmail(email);
            setCodeSent(true);
            setSuccess('Mã xác thực đã được gửi đến email của bạn');
            setLoading(false);
        } catch (error) {
            setError('Không thể gửi mã xác thực. Vui lòng thử lại sau.');
            setLoading(false);
        }
    };
    // Xác thực mã code
    const handleVerify = async () => {
        if (!code || code.trim() === '') {
            setError('Vui lòng nhập mã xác thực');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Đảm bảo registerData có đầy đủ thông tin theo UserRegisterRequest
            const updatedRegisterData = {
                ...registerData,
                username: registerData.username,
                password: registerData.password,
                email: email,
                phone: registerData.phone || '',
                firstName: registerData.firstName || '',
                lastName: registerData.lastName || '',
                gender: registerData.gender || 'MALE',
                birthday: registerData.birthday || null,
                avatar: registerData.avatar || 'default-avatar',
            };

            const response = await verifyEmailWithCode(
                email,
                code,
                updatedRegisterData,
            );

            // Lưu token xác thực
            if (response.accessToken)
                localStorage.setItem('accessToken', response.accessToken);
            if (response.refreshToken)
                localStorage.setItem('refreshToken', response.refreshToken);
            if (response.userId)
                localStorage.setItem('userId', response.userId);
            setLoading(false);
            setSuccess(
                'Đăng ký thành công! Chuyển hướng đến trang đăng nhập...',
            );

            // Xóa token khỏi localStorage vì ta muốn người dùng đăng nhập lại
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userId');

            // Chờ 2 giây cho người dùng đọc thông báo thành công, sau đó chuyển hướng
            setTimeout(() => {
                // Nếu có callback thì gọi
                if (onSuccess) {
                    onSuccess(response);
                }
                // Chuyển đến trang đăng nhập với thông tin đăng ký thành công
                navigate('/', {
                    state: {
                        registrationSuccess: true,
                        email: email,
                    },
                });
            }, 2000);
        } catch (error) {
            setError('Mã xác thực không đúng hoặc đã hết hạn.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full max-w-md mx-auto p-4">
            <div className="w-full p-8 bg-white rounded-2xl border border-blue-200 shadow-lg">
                <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
                    Xác thực email
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        {success}
                    </div>
                )}

                <div className="w-full">
                    <p className="text-sm text-gray-600 text-center mb-4">
                        {codeSent
                            ? `Mã xác thực đã được gửi đến email ${email}`
                            : `Nhấn nút bên dưới để gửi mã xác thực đến email ${email}`}
                    </p>

                    {!codeSent && (
                        <button
                            onClick={handleSendCode}
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-medium transition-colors ${
                                loading
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#0068ff] text-white hover:bg-[#0056d6]'
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                'Gửi mã xác thực'
                            )}
                        </button>
                    )}

                    {codeSent && (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mã xác thực
                                </label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
                                    placeholder="Nhập mã xác thực"
                                />
                            </div>

                            <button
                                onClick={handleVerify}
                                disabled={loading}
                                className={`w-full py-3 rounded-lg font-medium transition-colors mb-2 ${
                                    loading
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-[#0068ff] text-white hover:bg-[#0056d6]'
                                }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    'Xác thực'
                                )}
                            </button>

                            <button
                                onClick={handleSendCode}
                                disabled={loading}
                                className="w-full py-3 rounded-lg font-medium text-[#0068ff] hover:bg-blue-50 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                Gửi lại mã
                            </button>
                        </>
                    )}

                    <button
                        onClick={onBack}
                        className="w-full py-3 mt-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        Quay lại đăng ký
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
