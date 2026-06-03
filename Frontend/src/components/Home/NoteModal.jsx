import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Save, StickyNote } from 'lucide-react';
import { BiNotepad } from 'react-icons/bi';

const NoteModal = ({
    open,
    onClose,
    notes,
    onAddNote,
    onDeleteNote,
    onEditNote,
}) => {
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
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
                                <BiNotepad size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    Ghi chú nhóm
                                </h2>
                                <p className="text-white/80 text-sm">
                                    Quản lý ghi chú và thông tin quan trọng
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Add New Note */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
                                className="w-full px-4 py-2 mb-2 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                maxLength={50}
                            />
                            <textarea
                                value={newNoteContent}
                                onChange={(e) =>
                                    setNewNoteContent(e.target.value)
                                }
                                placeholder="Nhập nội dung ghi chú..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
                                rows={3}
                                maxLength={500}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-gray-500">
                                    {newNoteContent.length}/500 ký tự
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleAddNote}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium text-sm shadow-sm"
                                >
                                    Thêm ghi chú
                                </motion.button>
                            </div>
                        </div>

                        {/* Notes List */}
                        <div className="space-y-3">
                            {notes.length === 0 ? (
                                <div className="text-center py-12">
                                    <StickyNote
                                        size={48}
                                        className="mx-auto text-gray-300 mb-3"
                                    />
                                    <p className="text-gray-400">
                                        Chưa có ghi chú nào
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Tạo ghi chú đầu tiên để lưu thông tin
                                        quan trọng
                                    </p>
                                </div>
                            ) : (
                                notes.map((note, index) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all"
                                    >
                                        {editingNoteId === note.id ? (
                                            // Edit Mode
                                            <div>
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) =>
                                                        setEditTitle(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-3 py-2 mb-2 border border-slate-300 rounded-lg focus:border-emerald-500 outline-none font-semibold"
                                                    maxLength={50}
                                                />
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) =>
                                                        setEditContent(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-emerald-500 outline-none resize-none"
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
                                                            saveEdit(note.id)
                                                        }
                                                        className="flex-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                                    >
                                                        <Save size={14} />
                                                        Lưu
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{
                                                            scale: 1.05,
                                                        }}
                                                        whileTap={{
                                                            scale: 0.95,
                                                        }}
                                                        onClick={cancelEdit}
                                                        className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                                                    >
                                                        Hủy
                                                    </motion.button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
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
                                                                startEdit(note)
                                                            }
                                                            className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
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
                                                            <Trash2 size={16} />
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
                                                    ).toLocaleString('vi-VN')}
                                                </p>
                                            </>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
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

export default NoteModal;
