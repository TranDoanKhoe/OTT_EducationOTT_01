import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, BarChart3 } from 'lucide-react';
import { BiPoll } from 'react-icons/bi';

const PollModal = ({ open, onClose, onCreatePoll }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);

    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = () => {
        const validOptions = options.filter((opt) => opt.trim() !== '');
        if (!question.trim()) {
            alert('Vui lòng nhập câu hỏi!');
            return;
        }
        if (validOptions.length < 2) {
            alert('Vui lòng nhập ít nhất 2 lựa chọn!');
            return;
        }

        onCreatePoll({
            question: question.trim(),
            options: validOptions,
            allowMultiple,
            createdAt: new Date().toISOString(),
            votes: validOptions.map(() => []), // Mảng rỗng cho mỗi option
        });

        // Reset form
        setQuestion('');
        setOptions(['', '']);
        setAllowMultiple(false);
        onClose();
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-emerald-600 to-cyan-600 pt-8 pb-6 px-6">
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        >
                            <X size={20} />
                        </motion.button>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <BiPoll size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    Tạo bình chọn
                                </h2>
                                <p className="text-white/80 text-sm">
                                    Tạo poll để thu thập ý kiến nhóm
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6 max-h-[70vh] sm:max-h-[500px] overflow-y-auto">
                        {/* Question Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Câu hỏi <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Nhập câu hỏi của bạn..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                maxLength={200}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {question.length}/200 ký tự
                            </p>
                        </div>

                        {/* Options */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Lựa chọn <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-3">
                                {options.map((option, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold text-sm">
                                            {index + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) =>
                                                updateOption(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={`Lựa chọn ${index + 1}`}
                                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                            maxLength={100}
                                        />
                                        {options.length > 2 && (
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() =>
                                                    removeOption(index)
                                                }
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </motion.button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>

                            {options.length < 10 && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={addOption}
                                    className="mt-3 w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    Thêm lựa chọn
                                </motion.button>
                            )}
                        </div>

                        {/* Settings */}
                        <div className="mb-4">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={allowMultiple}
                                    onChange={(e) =>
                                        setAllowMultiple(e.target.checked)
                                    }
                                    className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        Cho phép chọn nhiều đáp án
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Thành viên có thể chọn nhiều lựa chọn
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                        >
                            Hủy
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            className="flex-1 px-4 py-2.5 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all font-medium shadow-sm"
                        >
                            Tạo bình chọn
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PollModal;
