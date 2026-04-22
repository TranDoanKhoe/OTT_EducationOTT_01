import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import {
    BiShow,
    BiHide,
    BiRefresh,
    BiUser,
    BiLock,
    BiEnvelope,
    BiPhone,
    BiCalendar,
    BiMale,
    BiFemale,
    BiUserCircle,
} from 'react-icons/bi';
import {
    FaGraduationCap,
    FaBook,
    FaUsers,
    FaVideo,
    FaComments,
    FaFolderOpen,
    FaChartLine,
    FaChalkboardTeacher,
} from 'react-icons/fa';
import { HiAcademicCap } from 'react-icons/hi';
import VerifyEmail from '../components/VerifyEmail';
import { auth } from '../firebase';
import ParallaxHoverCard from '../components/effects/ParallaxHoverCard';

const RAW_BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || 'https://ott-education-be.onrender.com';
const BACKEND_URL = (
    /^https?:\/\//i.test(RAW_BACKEND_URL)
        ? RAW_BACKEND_URL
        : RAW_BACKEND_URL
          ? `http://${RAW_BACKEND_URL}`
          : ''
).replace(/\/$/, '');
const getAuthUrl = (path) => (BACKEND_URL ? `${BACKEND_URL}${path}` : path);

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const normalizeVietnamPhoneToE164 = (phone) => {
    const cleaned = (phone || '').replace(/\s+/g, '').trim();
    if (!cleaned) return '';
    if (cleaned.startsWith('+840')) return `+84${cleaned.slice(4)}`;
    if (cleaned.startsWith('+84')) return cleaned;
    if (cleaned.startsWith('84')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+84${cleaned.slice(1)}`;
    return `+84${cleaned}`;
};

const generateCaptchaCode = (length = 5) =>
    Array.from(
        { length },
        () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)],
    ).join('');

const buildCaptchaImage = (code) => {
    const chars = code
        .split('')
        .map((ch, idx) => {
            const x = 15 + idx * 22;
            const y = 28 + Math.floor(Math.random() * 7 - 3);
            const rotate = Math.floor(Math.random() * 30 - 15);
            return `<text x="${x}" y="${y}" font-size="22" font-family="monospace" font-weight="700" fill="#1f2937" transform="rotate(${rotate} ${x} ${y})">${ch}</text>`;
        })
        .join('');

    const noise = Array.from({ length: 7 }, () => {
        const x1 = Math.floor(Math.random() * 120);
        const y1 = Math.floor(Math.random() * 42);
        const x2 = Math.floor(Math.random() * 120);
        const y2 = Math.floor(Math.random() * 42);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3b82f6" stroke-width="1" opacity="0.6"/>`;
    }).join('');

    const dots = Array.from({ length: 20 }, () => {
        const cx = Math.floor(Math.random() * 120);
        const cy = Math.floor(Math.random() * 42);
        return `<circle cx="${cx}" cy="${cy}" r="1" fill="#6b7280" opacity="0.5"/>`;
    }).join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="42" viewBox="0 0 120 42"><rect width="120" height="42" rx="6" fill="#eff6ff"/>${noise}${dots}${chars}</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Di chuyển ra ngoài component để tránh re-render
const InputField = ({
    icon: Icon,
    label,
    type = 'text',
    name,
    value,
    onChange,
    required = true,
    autoComplete,
    placeholder,
}) => {
    const isDateInput = type === 'date';

    return (
        <div className="space-y-1">
            <label className="block text-xs lg:text-sm font-medium text-gray-700">
                {label}
            </label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 lg:pl-3 flex items-center pointer-events-none">
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                    type={type}
                    name={name}
                    required={required}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`block w-full min-w-0 pl-8 lg:pl-10 pr-3 lg:pr-4 py-2 lg:py-2.5 border border-gray-200 rounded-lg lg:rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 outline-none text-sm text-gray-900 placeholder-gray-400 ${
                        isDateInput
                            ? 'cursor-pointer text-gray-700 [color-scheme:light]'
                            : ''
                    }`}
                />
            </div>
        </div>
    );
};

const PasswordField = ({
    label,
    name,
    value,
    onChange,
    show,
    onToggle,
    autoComplete,
}) => (
    <div className="space-y-1">
        <label className="block text-xs lg:text-sm font-medium text-gray-700">
            {label}
        </label>
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-2.5 lg:pl-3 flex items-center pointer-events-none">
                <BiLock className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
                type={show ? 'text' : 'password'}
                name={name}
                required
                autoComplete={autoComplete}
                value={value}
                onChange={onChange}
                placeholder="••••••••"
                className="block w-full pl-8 lg:pl-10 pr-10 lg:pr-12 py-2 lg:py-2.5 border border-gray-200 rounded-lg lg:rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 outline-none text-sm text-gray-900"
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute inset-y-0 right-0 pr-2.5 lg:pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
                {show ? (
                    <BiHide className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : (
                    <BiShow className="h-4 w-4 lg:h-5 lg:w-5" />
                )}
            </button>
        </div>
    </div>
);

const PasswordStrengthIndicator = ({ password }) => {
    if (!password) return null;

    const checks = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const percent = Math.round((passedChecks / 5) * 100);

    let colorClass = 'bg-red-500';
    let textClass = 'text-red-600';
    let label = 'Yếu';

    if (passedChecks >= 4) {
        colorClass = 'bg-emerald-500';
        textClass = 'text-emerald-600';
        label = 'Mạnh';
    } else if (passedChecks >= 3) {
        colorClass = 'bg-amber-500';
        textClass = 'text-amber-600';
        label = 'Trung bình';
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Độ mạnh mật khẩu</span>
                <span className={`font-semibold ${textClass}`}>{label}</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClass} transition-all duration-300`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
};

const PasswordFormatHint = ({ rules }) => {
    if (!rules || rules.isValid) return null;

    return (
        <div className="p-3 rounded-lg border border-gray-200 bg-white/80 text-sm text-gray-700 space-y-1.5">
            <p className="font-medium">Mật khẩu của bạn phải chứa:</p>
            <ul className="space-y-1 list-disc pl-5">
                <li className={rules.minLength ? 'text-emerald-700' : ''}>
                    Ít nhất 8 ký tự
                </li>
                <li
                    className={
                        rules.hasAtLeast3Groups ? 'text-emerald-700' : ''
                    }
                >
                    Ít nhất 3 trong số các điều sau:
                </li>
            </ul>
            <ul className="space-y-1 pl-5">
                <li className={rules.hasLowerCase ? 'text-emerald-700' : ''}>
                    {rules.hasLowerCase ? '✓ ' : '• '}Chữ cái viết thường (a-z)
                </li>
                <li className={rules.hasUpperCase ? 'text-emerald-700' : ''}>
                    {rules.hasUpperCase ? '✓ ' : '• '}Chữ cái viết hoa (A-Z)
                </li>
                <li className={rules.hasNumber ? 'text-emerald-700' : ''}>
                    {rules.hasNumber ? '✓ ' : '• '}Số (0-9)
                </li>
                <li className={rules.hasSpecialChar ? 'text-emerald-700' : ''}>
                    {rules.hasSpecialChar ? '✓ ' : '• '}Các ký tự đặc biệt (ví
                    dụ: !@#$%^&*)
                </li>
            </ul>
            <p className={rules.noTripleRepeat ? 'text-emerald-700' : ''}>
                {rules.noTripleRepeat ? '✓ ' : '• '}Không được có quá 2 ký tự
                giống nhau liên tiếp.
            </p>
        </div>
    );
};

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isResetPassword, setIsResetPassword] = useState(false);
    const [isEmailVerification, setIsEmailVerification] = useState(false);
    const [resetIdentifier, setResetIdentifier] = useState('');
    const [resetMethod, setResetMethod] = useState('email');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: '',
        avatar: 'default-avatar',
        newPassword: '',
        resetCode: '',
        code: '',
        firstName: '',
        lastName: '',
        gender: 'MALE',
        birthday: '',
    });
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingResetCode, setIsSendingResetCode] = useState(false);
    const [isSubmittingResetPassword, setIsSubmittingResetPassword] =
        useState(false);
    const [captchaCode, setCaptchaCode] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaImage, setCaptchaImage] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const recaptchaVerifierRef = useRef(null);
    const confirmationResultRef = useRef(null);

    const registrationSuccess = location.state?.registrationSuccess;
    const registeredEmail = location.state?.email;

    useEffect(() => {
        if (registrationSuccess) {
            setSuccessMessage(
                'Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.',
            );
            if (registeredEmail) {
                setFormData((prev) => ({ ...prev, username: registeredEmail }));
            }
            setIsLogin(true);
            setIsEmailVerification(false);
            setIsResetPassword(false);
            window.history.replaceState({}, document.title);
        }
    }, [registrationSuccess, registeredEmail]);

    useEffect(() => {
        if (location.state && location.state.successMessage) {
            setError(location.state.successMessage);
        }
    }, [location]);

    const refreshCaptcha = () => {
        const code = generateCaptchaCode();
        setCaptchaCode(code);
        setCaptchaImage(buildCaptchaImage(code));
        setCaptchaInput('');
    };

    useEffect(() => {
        refreshCaptcha();
    }, []);

    useEffect(() => {
        return () => {
            if (recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current.clear();
                recaptchaVerifierRef.current = null;
            }
        };
    }, []);

    const initFirebaseRecaptcha = async () => {
        if (!recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(
                auth,
                'firebase-recaptcha-container',
                {
                    size: 'invisible',
                },
            );
        }
        return recaptchaVerifierRef.current;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTogglePassword = () => setShowPassword((prev) => !prev);
    const handleToggleConfirmPassword = () =>
        setShowConfirmPassword((prev) => !prev);

    // Validate username (số điện thoại hoặc username chữ/số)
    const validateUsername = (username) => {
        // Số điện thoại VN: bắt đầu bằng 0, 10 số
        const phoneRegex = /^0\d{9}$/;
        // Username: 4-20 ký tự, chỉ chữ cái và số, bắt đầu bằng chữ
        const usernameRegex = /^[a-zA-Z][a-zA-Z0-9]{3,19}$/;
        return phoneRegex.test(username) || usernameRegex.test(username);
    };

    // Validate password
    const validatePassword = (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
            password,
        );
        const minLength = password.length >= 8;
        const groupsMatched = [
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecialChar,
        ].filter(Boolean).length;
        const hasAtLeast3Groups = groupsMatched >= 3;
        const noTripleRepeat = !/(.)\1\1/.test(password);

        return {
            isValid: minLength && hasAtLeast3Groups && noTripleRepeat,
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecialChar,
            minLength,
            hasAtLeast3Groups,
            noTripleRepeat,
        };
    };

    const registerPasswordRules = validatePassword(formData.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (isLogin) {
            if (!captchaInput.trim()) {
                setIsLoading(false);
                setError('Vui lòng nhập mã captcha.');
                return;
            }

            if (captchaInput.trim().toUpperCase() !== captchaCode) {
                setIsLoading(false);
                setError('Mã captcha không đúng. Vui lòng thử lại.');
                refreshCaptcha();
                return;
            }
        }

        // Validate username khi đăng ký
        if (!isLogin && !validateUsername(formData.username)) {
            setIsLoading(false);
            setError(
                'Tài khoản phải là số điện thoại (10 số, bắt đầu bằng 0) hoặc username (4-20 ký tự, chữ và số, bắt đầu bằng chữ)',
            );
            return;
        }

        if (!isLogin) {
            const passwordValidation = validatePassword(formData.password);
            if (!passwordValidation.isValid) {
                setIsLoading(false);
                setError(
                    'Mật khẩu chưa đúng định dạng, vui lòng xem gợi ý bên dưới.',
                );
                return;
            }
        }

        if (!isLogin && formData.password !== formData.confirmPassword) {
            setIsLoading(false);
            setError('Mật khẩu không khớp.');
            return;
        }

        if (isLogin) {
            try {
                const endpoint = getAuthUrl('/auth/login');
                const requestBody = {
                    username: formData.username,
                    password: formData.password,
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    let errorMessage = 'Đăng nhập thất bại';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        errorMessage =
                            response.status === 403
                                ? 'Tên đăng nhập hoặc mật khẩu không đúng'
                                : `Lỗi ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('Login response:', data); // Debug log
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('token', data.accessToken); // For admin API calls

                // Check if user is admin and redirect accordingly
                console.log('User role:', data.role); // Debug log
                if (data.role === 'ADMIN') {
                    localStorage.setItem('userRole', 'ADMIN');
                    navigate('/admin/dashboard');
                } else {
                    localStorage.setItem('userRole', data.role || 'STUDENT');
                    navigate('/home');
                }
            } catch (err) {
                setError(err.message);
                refreshCaptcha();
            } finally {
                setIsLoading(false);
            }
        } else {
            try {
                if (!formData.email || !formData.email.includes('@')) {
                    throw new Error('Email không hợp lệ');
                }
                if (!formData.phone) {
                    throw new Error('Số điện thoại không được để trống');
                }
                setIsEmailVerification(true);
                setIsLoading(false);
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex bg-liquid-app transition-smooth">
            {/* Left Panel - Branding - Hidden on mobile/tablet, visible on desktop (lg+) */}
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="hidden lg:flex lg:w-[45%] xl:w-1/2 2xl:w-[55%] glass-dark glass-fluid relative overflow-hidden"
            >
                {/* Decorative shapes */}
                <motion.div
                    animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    className="absolute top-0 right-0 w-72 h-72 xl:w-96 xl:h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"
                ></motion.div>
                <motion.div
                    animate={{
                        rotate: [360, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    className="absolute bottom-0 left-0 w-60 h-60 xl:w-80 xl:h-80 bg-amber-400/10 rounded-full translate-y-1/2 -translate-x-1/2"
                ></motion.div>
                <motion.div
                    animate={{
                        rotate: [0, 180, 0],
                        y: [0, -20, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="absolute top-1/3 left-1/4 w-24 h-24 xl:w-32 xl:h-32 bg-white/10 rounded-2xl rotate-12"
                ></motion.div>
                <motion.div
                    animate={{
                        rotate: [0, -180, 0],
                        y: [0, 20, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="absolute bottom-1/3 right-1/4 w-20 h-20 xl:w-24 xl:h-24 bg-white/10 rounded-xl -rotate-12"
                ></motion.div>

                {/* Content - Sử dụng justify-between để phân bố đều và đảm bảo stats luôn hiển thị */}
                <div className="relative z-10 flex flex-col justify-center items-center w-full h-full py-6 lg:py-8 px-6 lg:px-8 xl:px-10 text-white overflow-y-auto">
                    {/* Logo & Headline */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                            delay: 0.2,
                        }}
                        className="bg-white/90 backdrop-blur-md p-3 lg:p-4 rounded-2xl mb-4 lg:mb-6 shadow-2xl flex-shrink-0"
                    >
                        <img
                            src="/logo_ott_education.png"
                            alt="OTT Education"
                            className="w-16 h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 object-contain"
                        />
                    </motion.div>

                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl lg:text-3xl xl:text-4xl font-extrabold mb-2 text-center flex-shrink-0 tracking-tight leading-snug drop-shadow-sm"
                    >
                        OTT for Education
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm lg:text-base xl:text-lg text-blue-50 text-center max-w-xs lg:max-w-md mb-6 lg:mb-8 flex-shrink-0 opacity-90 drop-shadow-sm"
                    >
                        Hệ thống giao tiếp nội bộ chuyên biệt dành riêng cho
                        <span className="font-semibold block mt-1 text-cyan-200">
                            Giảng dạy & Học tập trực tuyến
                        </span>
                    </motion.p>

                    {/* Features Grid - Updated to match requirements exactly */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-2 gap-3 lg:gap-4 w-full max-w-[320px] lg:max-w-md flex-shrink-0"
                    >
                        {[
                            {
                                icon: FaChalkboardTeacher,
                                title: 'Kết Nối',
                                desc: 'Chat giữa Giảng viên - Sinh viên',
                            },
                            {
                                icon: FaUsers,
                                title: 'Cộng Đồng',
                                desc: 'Nhóm lớp học, nhóm môn học',
                            },
                            {
                                icon: FaFolderOpen,
                                title: 'Học Liệu',
                                desc: 'Gửi tài liệu, bài giảng, video',
                            },
                            {
                                icon: FaChartLine,
                                title: 'Thống Kê',
                                desc: 'Theo dõi hoạt động học tập',
                            },
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    delay: 0.6 + index * 0.1,
                                    type: 'spring',
                                    stiffness: 200,
                                }}
                                whileHover={{
                                    scale: 1.05,
                                    transition: { duration: 0.2 },
                                }}
                                className="flex flex-col items-center justify-center text-center glass-dark glass-fluid rounded-2xl p-4 lg:p-5 hover:bg-white/20 transition-all duration-300 border border-white/20"
                            >
                                <ParallaxHoverCard className="mb-2 lg:mb-3 inline-flex">
                                    <feature.icon className="text-2xl lg:text-3xl text-cyan-300 drop-shadow-lg" />
                                </ParallaxHoverCard>
                                <span className="font-bold text-white text-[13px] lg:text-sm mb-1 uppercase tracking-wide">
                                    {feature.title}
                                </span>
                                <span className="text-[10px] lg:text-xs text-blue-100 leading-tight opacity-80">
                                    {feature.desc}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Stats - Educational Context */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="flex gap-4 lg:gap-8 xl:gap-10 mt-6 lg:mt-8 pt-5 lg:pt-6 border-t border-white/10 flex-shrink-0 w-full max-w-sm justify-center"
                    >
                        <div className="text-center">
                            <div className="text-xl lg:text-2xl xl:text-3xl font-black text-white drop-shadow-md">
                                10k+
                            </div>
                            <div className="text-[10px] lg:text-xs text-cyan-200 mt-1 uppercase font-semibold tracking-wider">
                                Sinh viên
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl lg:text-2xl xl:text-3xl font-black text-white drop-shadow-md">
                                500+
                            </div>
                            <div className="text-[10px] lg:text-xs text-cyan-200 mt-1 uppercase font-semibold tracking-wider">
                                Giảng viên
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl lg:text-2xl xl:text-3xl font-black text-white drop-shadow-md">
                                99%
                            </div>
                            <div className="text-[10px] lg:text-xs text-cyan-200 mt-1 uppercase font-semibold tracking-wider">
                                Online
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Right Panel - Form - Full width on mobile, responsive on larger screens */}
            <div className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
                {isEmailVerification ? (
                    <VerifyEmail
                        email={formData.email}
                        registerData={{
                            username: formData.username,
                            password: formData.password,
                            email: formData.email,
                            phone: formData.phone,
                            gender: formData.gender,
                            birthday:
                                formData.birthday ||
                                new Date().toISOString().split('T')[0],
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            avatar: formData.avatar || 'default-avatar',
                            status: 'ACTIVE',
                        }}
                        onSuccess={(response) => {
                            if (response.accessToken)
                                localStorage.setItem(
                                    'accessToken',
                                    response.accessToken,
                                );
                            if (response.refreshToken)
                                localStorage.setItem(
                                    'refreshToken',
                                    response.refreshToken,
                                );
                            if (response.userId)
                                localStorage.setItem('userId', response.userId);
                            setError('');
                            alert('Đăng ký và xác thực email thành công!');
                        }}
                        onBack={() => setIsEmailVerification(false)}
                    />
                ) : (
                    <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="w-full max-w-sm lg:max-w-md"
                    >
                        {/* Mobile Logo */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: 'spring',
                                stiffness: 260,
                                damping: 20,
                                delay: 0.2,
                            }}
                            className="lg:hidden flex flex-col items-center mb-4"
                        >
                            <div className="bg-white p-2 rounded-xl shadow-lg mb-2">
                                <img
                                    src="/logo_ott_education.png"
                                    alt="OTT Education"
                                    className="w-12 h-12 object-contain"
                                />
                            </div>
                            <h1 className="text-xl font-bold text-emerald-700">
                                OTT Education
                            </h1>
                        </motion.div>

                        {/* Form Card */}
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="glass-light glass-fluid rounded-xl lg:rounded-2xl shadow-xl p-4 sm:p-5 lg:p-6 border border-white/40"
                        >
                            <div className="text-center mb-4 lg:mb-6">
                                <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: 'linear',
                                        repeatDelay: 3,
                                    }}
                                    className="inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-emerald-100 mb-2 lg:mb-3"
                                >
                                    <HiAcademicCap className="text-lg lg:text-xl text-emerald-600" />
                                </motion.div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={
                                            isLogin
                                                ? 'login'
                                                : isResetPassword
                                                  ? 'reset'
                                                  : 'register'
                                        }
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <h2 className="text-lg lg:text-xl font-bold text-gray-900">
                                            {isResetPassword
                                                ? 'Đặt lại mật khẩu'
                                                : isLogin
                                                  ? 'Đăng nhập'
                                                  : 'Tạo tài khoản'}
                                        </h2>
                                        <p className="text-gray-600 mt-1 text-sm">
                                            {isResetPassword
                                                ? resetMethod === 'email'
                                                    ? 'Nhập email để nhận mã xác nhận'
                                                    : 'Nhập số điện thoại để nhận OTP Firebase'
                                                : isLogin
                                                  ? 'Chào mừng bạn quay trở lại!'
                                                  : 'Đăng ký để bắt đầu học tập'}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: -10,
                                            height: 0,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            height: 'auto',
                                        }}
                                        exit={{ opacity: 0, y: -10, height: 0 }}
                                        className="mb-3 lg:mb-4 p-2.5 lg:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                                    >
                                        <div className="flex-shrink-0 w-7 h-7 lg:w-8 lg:h-8 bg-red-100 rounded-full flex items-center justify-center">
                                            <span className="text-red-500 text-sm">
                                                !
                                            </span>
                                        </div>
                                        <p className="text-red-600 text-xs lg:text-sm">
                                            {error}
                                        </p>
                                    </motion.div>
                                )}

                                {successMessage && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: -10,
                                            height: 0,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            height: 'auto',
                                        }}
                                        exit={{ opacity: 0, y: -10, height: 0 }}
                                        className="mb-3 lg:mb-4 p-2.5 lg:p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2"
                                    >
                                        <div className="flex-shrink-0 w-7 h-7 lg:w-8 lg:h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <span className="text-emerald-500 text-sm">
                                                ✓
                                            </span>
                                        </div>
                                        <p className="text-emerald-700 text-xs lg:text-sm">
                                            {successMessage}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.form
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                onSubmit={handleSubmit}
                                className="space-y-3 lg:space-y-4"
                            >
                                {isResetPassword ? (
                                    resetIdentifier ? (
                                        <>
                                            <InputField
                                                icon={BiEnvelope}
                                                label={
                                                    resetMethod === 'email'
                                                        ? 'Mã xác nhận'
                                                        : 'Mã OTP'
                                                }
                                                name="code"
                                                value={formData.code}
                                                onChange={handleChange}
                                                placeholder={
                                                    resetMethod === 'email'
                                                        ? 'Nhập mã từ email'
                                                        : 'Nhập mã OTP từ Firebase'
                                                }
                                            />
                                            <PasswordField
                                                label="Mật khẩu mới"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                show={showPassword}
                                                onToggle={handleTogglePassword}
                                            />
                                            <PasswordStrengthIndicator
                                                password={formData.password}
                                            />
                                            {formData.password && (
                                                <PasswordFormatHint
                                                    rules={
                                                        registerPasswordRules
                                                    }
                                                />
                                            )}
                                            <button
                                                type="button"
                                                className="w-full py-3.5 bg-gradient-to-r from-[#0068ff] to-[#0052cc] hover:from-[#0052cc] hover:to-[#003d99] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transform hover:-translate-y-0.5"
                                                onClick={async () => {
                                                    try {
                                                        setIsSubmittingResetPassword(
                                                            true,
                                                        );
                                                        if (
                                                            resetMethod ===
                                                            'sms'
                                                        ) {
                                                            if (
                                                                !confirmationResultRef.current
                                                            ) {
                                                                throw new Error(
                                                                    'Phiên OTP đã hết. Vui lòng gửi mã lại.',
                                                                );
                                                            }

                                                            const verifyResult =
                                                                await confirmationResultRef.current.confirm(
                                                                    formData.code,
                                                                );
                                                            const idToken =
                                                                await verifyResult.user.getIdToken();

                                                            const response =
                                                                await fetch(
                                                                    getAuthUrl(
                                                                        '/auth/reset-password-firebase-phone',
                                                                    ),
                                                                    {
                                                                        method: 'POST',
                                                                        headers:
                                                                            {
                                                                                'Content-Type':
                                                                                    'application/json',
                                                                            },
                                                                        body: JSON.stringify(
                                                                            {
                                                                                phone: resetIdentifier,
                                                                                password:
                                                                                    formData.password,
                                                                                idToken,
                                                                            },
                                                                        ),
                                                                    },
                                                                );

                                                            if (!response.ok) {
                                                                let message =
                                                                    'Đặt lại mật khẩu bằng OTP thất bại';
                                                                try {
                                                                    const errorData =
                                                                        await response.json();
                                                                    message =
                                                                        errorData.error ||
                                                                        errorData.message ||
                                                                        message;
                                                                } catch (parseErr) {
                                                                    // Keep fallback error message.
                                                                }
                                                                throw new Error(
                                                                    message,
                                                                );
                                                            }
                                                        } else {
                                                            const response =
                                                                await fetch(
                                                                    getAuthUrl(
                                                                        '/auth/reset-password',
                                                                    ),
                                                                    {
                                                                        method: 'POST',
                                                                        headers:
                                                                            {
                                                                                'Content-Type':
                                                                                    'application/json',
                                                                            },
                                                                        body: JSON.stringify(
                                                                            {
                                                                                code: formData.code,
                                                                                password:
                                                                                    formData.password,
                                                                            },
                                                                        ),
                                                                    },
                                                                );
                                                            if (!response.ok)
                                                                throw new Error(
                                                                    'Reset mật khẩu thất bại',
                                                                );
                                                        }

                                                        confirmationResultRef.current =
                                                            null;
                                                        setIsResetPassword(
                                                            false,
                                                        );
                                                        setIsLogin(true);
                                                        setResetIdentifier('');
                                                        setResetMethod('email');
                                                        setSuccessMessage(
                                                            'Đổi mật khẩu thành công! Vui lòng đăng nhập.',
                                                        );
                                                        setError('');
                                                    } catch (err) {
                                                        setError(err.message);
                                                    } finally {
                                                        setIsSubmittingResetPassword(
                                                            false,
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    isSubmittingResetPassword
                                                }
                                            >
                                                {isSubmittingResetPassword
                                                    ? 'Đang xử lý...'
                                                    : 'Đặt lại mật khẩu'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <InputField
                                                icon={
                                                    resetMethod === 'email'
                                                        ? BiEnvelope
                                                        : BiPhone
                                                }
                                                label={
                                                    resetMethod === 'email'
                                                        ? 'Email'
                                                        : 'Số điện thoại (Firebase OTP)'
                                                }
                                                type={
                                                    resetMethod === 'email'
                                                        ? 'email'
                                                        : 'tel'
                                                }
                                                name={
                                                    resetMethod === 'email'
                                                        ? 'email'
                                                        : 'phone'
                                                }
                                                value={
                                                    resetMethod === 'email'
                                                        ? formData.email
                                                        : formData.phone
                                                }
                                                onChange={handleChange}
                                                placeholder={
                                                    resetMethod === 'email'
                                                        ? 'example@email.com'
                                                        : '0912345678'
                                                }
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setResetMethod('email')
                                                    }
                                                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                                                        resetMethod === 'email'
                                                            ? 'bg-emerald-700 border-emerald-700 text-white'
                                                            : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700'
                                                    }`}
                                                >
                                                    Qua Email
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setResetMethod('sms')
                                                    }
                                                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                                                        resetMethod === 'sms'
                                                            ? 'bg-emerald-700 border-emerald-700 text-white'
                                                            : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700'
                                                    }`}
                                                >
                                                    Qua SĐT OTP
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:bg-emerald-300 disabled:text-emerald-100 disabled:cursor-not-allowed"
                                                disabled={isSendingResetCode}
                                                onClick={async () => {
                                                    try {
                                                        setIsSendingResetCode(
                                                            true,
                                                        );
                                                        const normalizedPhone =
                                                            normalizeVietnamPhoneToE164(
                                                                formData.phone,
                                                            );

                                                        if (
                                                            resetMethod ===
                                                            'sms'
                                                        ) {
                                                            const appVerifier =
                                                                await initFirebaseRecaptcha();
                                                            const confirmationResult =
                                                                await signInWithPhoneNumber(
                                                                    auth,
                                                                    normalizedPhone,
                                                                    appVerifier,
                                                                );
                                                            confirmationResultRef.current =
                                                                confirmationResult;
                                                        } else {
                                                            const response =
                                                                await fetch(
                                                                    getAuthUrl(
                                                                        '/auth/forgot-password',
                                                                    ),
                                                                    {
                                                                        method: 'POST',
                                                                        headers:
                                                                            {
                                                                                'Content-Type':
                                                                                    'application/json',
                                                                            },
                                                                        body: JSON.stringify(
                                                                            {
                                                                                email: formData.email,
                                                                            },
                                                                        ),
                                                                    },
                                                                );

                                                            if (!response.ok) {
                                                                let errorMessage =
                                                                    'Gửi mã qua email thất bại';

                                                                try {
                                                                    const errorData =
                                                                        await response.json();
                                                                    errorMessage =
                                                                        errorData.error ||
                                                                        errorData.message ||
                                                                        errorMessage;
                                                                } catch (parseErr) {
                                                                    // Keep default message when server does not return JSON.
                                                                }

                                                                throw new Error(
                                                                    errorMessage,
                                                                );
                                                            }
                                                        }

                                                        setResetIdentifier(
                                                            resetMethod ===
                                                                'email'
                                                                ? formData.email
                                                                : normalizedPhone,
                                                        );
                                                        setSuccessMessage(
                                                            resetMethod ===
                                                                'email'
                                                                ? 'Hệ thống đã tiếp nhận yêu cầu. Vui lòng kiểm tra hộp thư (và Spam) sau 1-2 phút.'
                                                                : 'Đã gửi OTP Firebase tới số điện thoại của bạn. Vui lòng nhập mã để đặt lại mật khẩu.',
                                                        );
                                                        setError('');
                                                    } catch (err) {
                                                        setError(err.message);
                                                    } finally {
                                                        setIsSendingResetCode(
                                                            false,
                                                        );
                                                    }
                                                }}
                                            >
                                                {isSendingResetCode
                                                    ? 'Đang gửi...'
                                                    : 'Gửi mã xác nhận'}
                                            </button>
                                            <div id="firebase-recaptcha-container"></div>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <InputField
                                            icon={BiUser}
                                            label="Tên đăng nhập"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            autoComplete="username"
                                            placeholder="Nhập tên đăng nhập"
                                        />

                                        {!isLogin && (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
                                                    <div className="space-y-1">
                                                        <label className="block text-xs lg:text-sm font-medium text-gray-700">
                                                            Họ
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="firstName"
                                                            required
                                                            value={
                                                                formData.firstName
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            placeholder="Nguyễn"
                                                            className="block w-full px-3 lg:px-4 py-2 lg:py-2.5 border border-gray-200 rounded-lg lg:rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 outline-none text-sm text-gray-900 placeholder-gray-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-xs lg:text-sm font-medium text-gray-700">
                                                            Tên
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lastName"
                                                            required
                                                            value={
                                                                formData.lastName
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            placeholder="Văn A"
                                                            className="block w-full px-3 lg:px-4 py-2 lg:py-2.5 border border-gray-200 rounded-lg lg:rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 outline-none text-sm text-gray-900 placeholder-gray-400"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs lg:text-sm font-medium text-gray-700">
                                                        Giới tính
                                                    </label>
                                                    <div className="flex gap-2 lg:gap-3">
                                                        {[
                                                            {
                                                                value: 'MALE',
                                                                label: 'Nam',
                                                                Icon: BiMale,
                                                            },
                                                            {
                                                                value: 'FEMALE',
                                                                label: 'Nữ',
                                                                Icon: BiFemale,
                                                            },
                                                            {
                                                                value: 'OTHER',
                                                                label: 'Khác',
                                                                Icon: BiUserCircle,
                                                            },
                                                        ].map((option) => (
                                                            <label
                                                                key={
                                                                    option.value
                                                                }
                                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 lg:py-2.5 px-2 lg:px-3 rounded-lg lg:rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                                                                    formData.gender ===
                                                                    option.value
                                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="gender"
                                                                    value={
                                                                        option.value
                                                                    }
                                                                    checked={
                                                                        formData.gender ===
                                                                        option.value
                                                                    }
                                                                    onChange={
                                                                        handleChange
                                                                    }
                                                                    className="sr-only"
                                                                />
                                                                <option.Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                                                                <span className="text-xs lg:text-sm font-medium">
                                                                    {
                                                                        option.label
                                                                    }
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <InputField
                                                    icon={BiEnvelope}
                                                    label="Email"
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    autoComplete="email"
                                                    placeholder="example@email.com"
                                                />

                                                <InputField
                                                    icon={BiPhone}
                                                    label="Số điện thoại"
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    autoComplete="tel"
                                                    placeholder="0912 345 678"
                                                />

                                                <InputField
                                                    icon={BiCalendar}
                                                    label="Ngày sinh"
                                                    type="date"
                                                    name="birthday"
                                                    value={formData.birthday}
                                                    onChange={handleChange}
                                                />
                                            </>
                                        )}

                                        <PasswordField
                                            label="Mật khẩu"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            show={showPassword}
                                            onToggle={handleTogglePassword}
                                            autoComplete="current-password"
                                        />

                                        {isLogin && (
                                            <div className="space-y-1.5">
                                                <label className="block text-xs lg:text-sm font-medium text-gray-700">
                                                    Mã xác nhận
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={captchaInput}
                                                        onChange={(e) =>
                                                            setCaptchaInput(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Nhập mã"
                                                        className="min-w-0 flex-1 px-3 py-2 lg:py-2.5 border border-gray-200 rounded-lg lg:rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 outline-none text-sm text-gray-900"
                                                        maxLength={8}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={refreshCaptcha}
                                                        className="h-10 w-10 lg:h-11 lg:w-11 rounded-lg border border-orange-200 bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors flex items-center justify-center"
                                                        aria-label="Đổi mã captcha"
                                                    >
                                                        <BiRefresh className="h-5 w-5" />
                                                    </button>
                                                    {captchaImage && (
                                                        <img
                                                            src={captchaImage}
                                                            alt="captcha"
                                                            className="h-10 lg:h-11 w-[120px] rounded-lg border border-gray-200 bg-white object-cover"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!isLogin && (
                                            <PasswordStrengthIndicator
                                                password={formData.password}
                                            />
                                        )}

                                        {!isLogin && formData.password && (
                                            <PasswordFormatHint
                                                rules={registerPasswordRules}
                                            />
                                        )}

                                        {!isLogin && (
                                            <PasswordField
                                                label="Nhập lại mật khẩu"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                show={showConfirmPassword}
                                                onToggle={
                                                    handleToggleConfirmPassword
                                                }
                                            />
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-2.5 lg:py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-sm lg:text-base rounded-lg lg:rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <svg
                                                        className="animate-spin h-4 w-4 lg:h-5 lg:w-5"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                            fill="none"
                                                        />
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        />
                                                    </svg>
                                                    <span>Đang xử lý...</span>
                                                </>
                                            ) : (
                                                <span>
                                                    {isLogin
                                                        ? 'Đăng nhập'
                                                        : 'Đăng ký'}
                                                </span>
                                            )}
                                        </button>
                                    </>
                                )}

                                {/* Links */}
                                <div className="pt-3 lg:pt-4 border-t border-gray-100 space-y-2 lg:space-y-3">
                                    {!isResetPassword && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="button"
                                            onClick={() => {
                                                setIsLogin(!isLogin);
                                                setError('');
                                                setSuccessMessage('');
                                                refreshCaptcha();
                                            }}
                                            className="w-full text-center text-sm lg:text-base text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                                        >
                                            {isLogin
                                                ? 'Chưa có tài khoản? Đăng ký ngay'
                                                : 'Đã có tài khoản? Đăng nhập'}
                                        </motion.button>
                                    )}
                                    {isLogin && !isResetPassword && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="button"
                                            onClick={() => {
                                                setIsResetPassword(true);
                                                setError('');
                                                setSuccessMessage('');
                                            }}
                                            className="w-full text-center text-gray-500 hover:text-gray-700 text-sm transition-colors"
                                        >
                                            Quên mật khẩu?
                                        </motion.button>
                                    )}
                                    {isResetPassword && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="button"
                                            onClick={() => {
                                                setIsResetPassword(false);
                                                setIsLogin(true);
                                                setResetIdentifier('');
                                                setResetMethod('email');
                                                confirmationResultRef.current =
                                                    null;
                                                setError('');
                                                setSuccessMessage('');
                                            }}
                                            className="w-full text-center text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                                        >
                                            ← Quay lại đăng nhập
                                        </motion.button>
                                    )}
                                </div>
                            </motion.form>
                        </motion.div>

                        {/* Footer */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-center text-gray-400 text-sm mt-6"
                        >
                            © 2026 OTT Education. Nền tảng học tập trực tuyến.
                        </motion.p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Login;
