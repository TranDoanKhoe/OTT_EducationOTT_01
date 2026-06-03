import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BiMessageSquareDetail,
    BiBot,
    BiUser,
    BiCog,
    BiLogOut,
    BiBookOpen,
    BiCheck,
    BiBell,
    BiGroup,
} from 'react-icons/bi';
import { FaGraduationCap, FaChalkboardTeacher } from 'react-icons/fa';
import { HiAcademicCap } from 'react-icons/hi';
import ParallaxHoverCard from '../effects/ParallaxHoverCard';

const CustomMenuItem = ({ icon, label, onClick, color = 'inherit' }) => (
    <button
        onClick={onClick}
        className={`w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 transition-colors ${color === 'red' ? 'text-red-600' : 'text-gray-700'}`}
    >
        {icon}
        <span className="text-sm font-medium">{label}</span>
    </button>
);

const NavSidebar = ({
    userProfile,
    currentView,
    aiChatActive = false,
    onViewChange,
    onOpenAIChat,
    onProfileOpen,
    onLogout,
    onOpenChangePasswordModal,
    notificationCount = 0,
    canAccessClasses = false,
}) => {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const NavButton = ({ icon: Icon, isActive, onClick, badge, tooltip }) => (
        <div className="relative group">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`tap-target p-2.5 md:p-3 rounded-xl transition-all duration-200 ${
                    isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                onClick={onClick}
            >
                <ParallaxHoverCard className="inline-flex">
                    <Icon size={22} className="md:w-6 md:h-6" />
                </ParallaxHoverCard>
                {badge > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-secondary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center badge-pulse"
                    >
                        {badge > 9 ? '9+' : badge}
                    </motion.span>
                )}
            </motion.button>
            {tooltip && (
                <div className="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {tooltip}
                </div>
            )}
        </div>
    );

    return (
        <>
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="fixed bottom-0 left-0 right-0 z-30 h-[calc(68px+env(safe-area-inset-bottom))] lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:h-auto bg-gradient-to-r lg:bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 w-full lg:w-[80px] flex flex-row lg:flex-col items-center justify-between lg:justify-start px-3 lg:px-0 pt-2 pb-[env(safe-area-inset-bottom)] lg:py-6 shadow-2xl overflow-visible"
            >
                {/* Animated Background Effects */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="hidden lg:block absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none z-0"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 1,
                    }}
                    className="hidden lg:block absolute bottom-0 left-0 w-24 h-24 bg-cyan-300/20 rounded-full blur-2xl pointer-events-none z-0"
                />

                {/* Logo */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: 0.2,
                    }}
                    className="hidden lg:block mb-6 relative z-10"
                >
                    <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/20"
                    >
                        <ParallaxHoverCard className="inline-flex">
                            <HiAcademicCap size={28} className="text-white" />
                        </ParallaxHoverCard>
                    </motion.div>
                </motion.div>

                {/* Avatar */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: 0.3,
                    }}
                    whileHover={{ scale: 1.1 }}
                    className="hidden lg:block w-12 h-12 rounded-xl mb-8 cursor-pointer overflow-hidden border-2 border-white/30 hover:border-white/60 transition-all duration-200"
                    onClick={onProfileOpen}
                >
                    {userProfile?.avatar ? (
                        <img
                            src={userProfile.avatar}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-white/20 flex items-center justify-center">
                            <BiUser size={24} className="text-white/70" />
                        </div>
                    )}
                </motion.div>

                {/* Main Navigation */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-row lg:flex-col items-center justify-around lg:justify-start gap-2 lg:gap-3 flex-1 w-full relative z-10"
                >
                    <NavButton
                        icon={BiMessageSquareDetail}
                        isActive={currentView === 'messages' && !aiChatActive}
                        onClick={() => onViewChange('messages')}
                        tooltip="Tin nhắn"
                    />

                    <NavButton
                        icon={BiBot}
                        isActive={aiChatActive}
                        onClick={onOpenAIChat}
                        tooltip="Chat với AI"
                    />

                    {canAccessClasses && (
                        <NavButton
                            icon={BiGroup}
                            isActive={currentView === 'classes'}
                            onClick={() => onViewChange('classes')}
                            tooltip="Lớp học & Nhóm"
                        />
                    )}

                    <NavButton
                        icon={BiBell}
                        isActive={currentView === 'notifications'}
                        onClick={() => onViewChange('notifications')}
                        badge={notificationCount}
                        tooltip="Thông báo"
                    />

                    <NavButton
                        icon={BiBookOpen}
                        isActive={currentView === 'resources'}
                        onClick={() => onViewChange('resources')}
                        tooltip="Tài liệu"
                    />
                </motion.div>

                {/* Settings at Bottom */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-0 lg:mt-auto relative z-20"
                >
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`tap-target p-3 rounded-xl transition-all duration-200 relative z-20 cursor-pointer ${
                            currentView === 'settings'
                                ? 'bg-white/20 text-white shadow-lg'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e);
                        }}
                        type="button"
                    >
                        <BiCog size={26} />
                    </motion.button>
                </motion.div>
            </motion.div>

            {/* Dropdown Menu - Render outside sidebar to avoid overflow issues */}
            {anchorEl && (
                <>
                    <div
                        className="fixed inset-0 z-[999]"
                        onClick={handleMenuClose}
                    />
                    <div className="fixed bottom-[82px] left-4 right-4 md:bottom-[74px] md:left-[90px] md:right-auto bg-white rounded-xl shadow-2xl py-2 z-[1000] min-w-0 md:min-w-[220px] border border-gray-100">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900">
                                {userProfile?.firstName} {userProfile?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                                {userProfile?.email}
                            </p>
                        </div>
                        <CustomMenuItem
                            icon={
                                <BiUser
                                    size={20}
                                    className="text-emerald-600"
                                />
                            }
                            label="Thông tin tài khoản"
                            onClick={() => {
                                onProfileOpen();
                                handleMenuClose();
                            }}
                        />
                        <CustomMenuItem
                            icon={
                                <BiCog size={20} className="text-emerald-600" />
                            }
                            label="Đổi mật khẩu"
                            onClick={() => {
                                handleMenuClose();
                                onOpenChangePasswordModal();
                            }}
                        />
                        <div className="border-t border-gray-100 my-1" />
                        <CustomMenuItem
                            icon={<BiLogOut size={20} />}
                            label="Đăng xuất"
                            onClick={() => {
                                onLogout();
                                handleMenuClose();
                            }}
                            color="red"
                        />
                    </div>
                </>
            )}
        </>
    );
};

export default NavSidebar;
