import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    StickyNote,
    Pin,
    BarChart3,
    Plus,
    Trash2,
    Edit2,
    Save,
} from 'lucide-react';
import { BiNotepad, BiPin, BiPoll } from 'react-icons/bi';

const GroupFeaturesModal = ({
    open,
    onClose,
    // Notes props
    notes,
    onAddNote,
    onEditNote,
    onDeleteNote,
    // Pinned messages props
    pinnedMessages,
    onUnpinMessage,
    onSelectMessage,
    // Polls props
    polls,
    onVotePoll,
    userId,
}) => {
    const [activeTab, setActiveTab] = useState('notes');

    // Note editing states
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');

    const handleAddNote = () => {
        if (!newNoteContent.trim()) {
            alert('Vui lòng nhập nội dung ghi chú!');
            return;
        }

        onAddNote({
            id: Date.now(),
            title: newNoteTitle.trim() || 'Ghi chú',
            content: newNoteContent.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        setNewNoteTitle('');
        setNewNoteContent('');
    };

    const startEdit = (note) => {
        setEditingNoteId(note.id);
        setEditTitle(note.title);
        setEditContent(note.content);
    };

    const cancelEdit = () => {
        setEditingNoteId(null);
        setEditTitle('');
        setEditContent('');
    };

    const saveEdit = (noteId) => {
        if (!editContent.trim()) {
            alert('Nội dung ghi chú không được để trống!');
            return;
        }

        onEditNote(noteId, {
            title: editTitle.trim() || 'Ghi chú',
            content: editContent.trim(),
            updatedAt: new Date().toISOString(),
        });

        cancelEdit();
    };

    if (!open) return null;

    const tabs = [
        { id: 'notes', label: 'Ghi chú', icon: BiNotepad, color: 'amber' },
        { id: 'pinned', label: 'Tin nhắn ghim', icon: BiPin, color: 'orange' },
        { id: 'polls', label: 'Bình chọn', icon: BiPoll, color: 'purple' },
    ];

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
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 pt-8 pb-6 px-6">
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        >
                            <X size={20} />
                        </motion.button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <StickyNote size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    Tiện ích nhóm
                                </h2>
                                <p className="text-white/80 text-sm">
                                    Ghi chú, ghim tin nhắn và bình chọn
                                </p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <motion.button
                                        key={tab.id}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-white text-gray-800 shadow-lg'
                                                : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                    >
                                        <Icon size={20} />
                                        <span className="text-sm">
                                            {tab.label}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <AnimatePresence mode="wait">
                            {/* Notes Tab */}
                            {activeTab === 'notes' && (
                                <motion.div
                                    key="notes"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Add New Note */}
                                    <div className="mb-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <Plus size={16} />
                                            Tạo ghi chú mới
                                        </h3>
                                        <input
                                            type="text"
                                            value={newNoteTitle}
                                            onChange={(e) =>
                                                setNewNoteTitle(e.target.value)
                                            }
                                            placeholder="Tiêu đề (tùy chọn)"
                                            className="w-full px-4 py-2 mb-2 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                            maxLength={50}
                                        />
                                        <textarea
                                            value={newNoteContent}
                                            onChange={(e) =>
                                                setNewNoteContent(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Nhập nội dung ghi chú..."
                                            className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-none"
                                            rows={3}
                                            maxLength={500}
                                        />
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-xs text-gray-500">
                                                {newNoteContent.length}/500 ký
                                                tự
                                            </p>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleAddNote}
                                                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-medium text-sm shadow-lg shadow-amber-500/30"
                                            >
                                                Thêm ghi chú
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Notes List */}
                                    <div className="space-y-3">
                                        {notes?.length === 0 ? (
                                            <div className="text-center py-12">
                                                <StickyNote
                                                    size={48}
                                                    className="mx-auto text-gray-300 mb-3"
                                                />
                                                <p className="text-gray-400">
                                                    Chưa có ghi chú nào
                                                </p>
                                            </div>
                                        ) : (
                                            notes?.map((note, index) => (
                                                <motion.div
                                                    key={note.id}
                                                    initial={{
                                                        opacity: 0,
                                                        y: 20,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                    }}
                                                    transition={{
                                                        delay: index * 0.05,
                                                    }}
                                                    className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all"
                                                >
                                                    {editingNoteId ===
                                                    note.id ? (
                                                        <div>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    editTitle
                                                                }
                                                                onChange={(e) =>
                                                                    setEditTitle(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full px-3 py-2 mb-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 outline-none font-semibold"
                                                                maxLength={50}
                                                            />
                                                            <textarea
                                                                value={
                                                                    editContent
                                                                }
                                                                onChange={(e) =>
                                                                    setEditContent(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 outline-none resize-none"
                                                                rows={3}
                                                                maxLength={500}
                                                            />
                                                            <div className="flex gap-2 mt-2">
                                                                <motion.button
                                                                    whileHover={{
                                                                        scale: 1.05,
                                                                    }}
                                                                    whileTap={{
                                                                        scale: 0.95,
                                                                    }}
                                                                    onClick={() =>
                                                                        saveEdit(
                                                                            note.id,
                                                                        )
                                                                    }
                                                                    className="flex-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                                                >
                                                                    <Save
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                    Lưu
                                                                </motion.button>
                                                                <motion.button
                                                                    whileHover={{
                                                                        scale: 1.05,
                                                                    }}
                                                                    whileTap={{
                                                                        scale: 0.95,
                                                                    }}
                                                                    onClick={
                                                                        cancelEdit
                                                                    }
                                                                    className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                                                                >
                                                                    Hủy
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-semibold text-gray-800">
                                                                    {note.title}
                                                                </h4>
                                                                <div className="flex gap-1">
                                                                    <motion.button
                                                                        whileHover={{
                                                                            scale: 1.1,
                                                                        }}
                                                                        whileTap={{
                                                                            scale: 0.9,
                                                                        }}
                                                                        onClick={() =>
                                                                            startEdit(
                                                                                note,
                                                                            )
                                                                        }
                                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Edit2
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                    </motion.button>
                                                                    <motion.button
                                                                        whileHover={{
                                                                            scale: 1.1,
                                                                        }}
                                                                        whileTap={{
                                                                            scale: 0.9,
                                                                        }}
                                                                        onClick={() =>
                                                                            onDeleteNote(
                                                                                note.id,
                                                                            )
                                                                        }
                                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                    </motion.button>
                                                                </div>
                                                            </div>
                                                            <p className="text-gray-600 text-sm whitespace-pre-wrap mb-2">
                                                                {note.content}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {new Date(
                                                                    note.updatedAt ||
                                                                        note.createdAt,
                                                                ).toLocaleString(
                                                                    'vi-VN',
                                                                )}
                                                            </p>
                                                        </>
                                                    )}
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Pinned Messages Tab */}
                            {activeTab === 'pinned' && (
                                <motion.div
                                    key="pinned"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {pinnedMessages?.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Pin
                                                size={48}
                                                className="mx-auto text-gray-300 mb-3"
                                            />
                                            <p className="text-gray-400">
                                                Không có tin nhắn nào được ghim
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {pinnedMessages?.map(
                                                (message, index) => (
                                                    <motion.div
                                                        key={message.id}
                                                        initial={{
                                                            opacity: 0,
                                                            y: 20,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        transition={{
                                                            delay: index * 0.05,
                                                        }}
                                                        className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                                                        onClick={() => {
                                                            onSelectMessage(
                                                                message,
                                                            );
                                                            onClose();
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-gray-800 mb-2">
                                                                    {message.type ===
                                                                    'TEXT'
                                                                        ? message.content
                                                                        : message.type ===
                                                                            'IMAGE'
                                                                          ? '[Hình ảnh]'
                                                                          : message.type ===
                                                                              'VIDEO'
                                                                            ? '[Video]'
                                                                            : message.type ===
                                                                                'FILE'
                                                                              ? message.fileName ||
                                                                                '[File]'
                                                                              : 'Tin nhắn'}
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    {new Date(
                                                                        message.createAt,
                                                                    ).toLocaleString(
                                                                        'vi-VN',
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <motion.button
                                                                whileHover={{
                                                                    scale: 1.1,
                                                                }}
                                                                whileTap={{
                                                                    scale: 0.9,
                                                                }}
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    onUnpinMessage(
                                                                        message,
                                                                    );
                                                                }}
                                                                className="p-2 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                                                            >
                                                                <Pin
                                                                    size={18}
                                                                />
                                                            </motion.button>
                                                        </div>
                                                    </motion.div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Polls Tab */}
                            {activeTab === 'polls' && (
                                <motion.div
                                    key="polls"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {polls?.length === 0 ? (
                                        <div className="text-center py-12">
                                            <BarChart3
                                                size={48}
                                                className="mx-auto text-gray-300 mb-3"
                                            />
                                            <p className="text-gray-400">
                                                Chưa có bình chọn nào
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {polls?.map((poll, pollIndex) => {
                                                const totalVotes =
                                                    poll.votes.reduce(
                                                        (sum, votes) =>
                                                            sum + votes.length,
                                                        0,
                                                    );
                                                return (
                                                    <motion.div
                                                        key={poll.id}
                                                        initial={{
                                                            opacity: 0,
                                                            y: 20,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        transition={{
                                                            delay:
                                                                pollIndex *
                                                                0.05,
                                                        }}
                                                        className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl"
                                                    >
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-200">
                                                            <BiPoll
                                                                size={20}
                                                                className="text-purple-600"
                                                            />
                                                            <h4 className="font-semibold text-gray-800">
                                                                {poll.question}
                                                            </h4>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {poll.options.map(
                                                                (
                                                                    option,
                                                                    idx,
                                                                ) => {
                                                                    const votes =
                                                                        poll
                                                                            .votes[
                                                                            idx
                                                                        ]
                                                                            ?.length ||
                                                                        0;
                                                                    const percentage =
                                                                        totalVotes >
                                                                        0
                                                                            ? Math.round(
                                                                                  (votes /
                                                                                      totalVotes) *
                                                                                      100,
                                                                              )
                                                                            : 0;
                                                                    const userVoted =
                                                                        poll.votes[
                                                                            idx
                                                                        ]?.includes(
                                                                            userId,
                                                                        );

                                                                    return (
                                                                        <motion.button
                                                                            key={
                                                                                idx
                                                                            }
                                                                            whileHover={{
                                                                                scale: 1.02,
                                                                            }}
                                                                            whileTap={{
                                                                                scale: 0.98,
                                                                            }}
                                                                            onClick={() =>
                                                                                onVotePoll(
                                                                                    poll.id,
                                                                                    idx,
                                                                                )
                                                                            }
                                                                            className={`w-full text-left p-3 rounded-lg transition-all relative overflow-hidden ${
                                                                                userVoted
                                                                                    ? 'bg-purple-200 border-2 border-purple-400'
                                                                                    : 'bg-white hover:bg-gray-50 border-2 border-gray-200'
                                                                            }`}
                                                                        >
                                                                            <div
                                                                                className="absolute inset-0 bg-purple-300/40"
                                                                                style={{
                                                                                    width: `${percentage}%`,
                                                                                    transition:
                                                                                        'width 0.3s ease',
                                                                                }}
                                                                            />
                                                                            <div className="relative flex justify-between items-center">
                                                                                <span className="font-medium text-gray-800">
                                                                                    {
                                                                                        option
                                                                                    }
                                                                                </span>
                                                                                <span className="text-sm text-gray-600">
                                                                                    {
                                                                                        percentage
                                                                                    }
                                                                                    %
                                                                                    (
                                                                                    {
                                                                                        votes
                                                                                    }
                                                                                    )
                                                                                </span>
                                                                            </div>
                                                                        </motion.button>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-3 text-center">
                                                            {totalVotes} lượt
                                                            bình chọn
                                                            {poll.allowMultiple &&
                                                                ' • Chọn nhiều đáp án'}
                                                        </p>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="w-full px-4 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                        >
                            Đóng
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default GroupFeaturesModal;
