// @ts-nocheck
// CreateNoteModal - Modal tạo/sửa note
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CreateNoteModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (noteData: any) => Promise<void>;
    onUpdate?: (noteId: string, noteData: any) => Promise<void>;
    editingNote?: any;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
    visible,
    onClose,
    onCreate,
    onUpdate,
    editingNote,
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = Boolean(editingNote);

    useEffect(() => {
        if (editingNote) {
            setTitle(editingNote.title || '');
            setContent(editingNote.content || '');
        } else {
            setTitle('');
            setContent('');
        }
    }, [editingNote, visible]);

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            return;
        }

        setIsSaving(true);
        try {
            const noteData = {
                title: title.trim(),
                content: content.trim(),
            };

            if (isEditing && onUpdate) {
                await onUpdate(editingNote.id, noteData);
            } else {
                await onCreate(noteData);
            }

            // Reset form
            setTitle('');
            setContent('');
            onClose();
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = title.trim() && content.trim();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {isEditing ? 'Chỉnh sửa ghi chú' : 'Tạo ghi chú'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Title */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Tiêu đề *</Text>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="Nhập tiêu đề..."
                                value={title}
                                onChangeText={setTitle}
                                maxLength={100}
                            />
                            <Text style={styles.charCount}>
                                {title.length}/100
                            </Text>
                        </View>

                        {/* Content */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Nội dung *</Text>
                            <TextInput
                                style={styles.contentInput}
                                placeholder="Nhập nội dung..."
                                value={content}
                                onChangeText={setContent}
                                multiline
                                maxLength={1000}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>
                                {content.length}/1000
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.cancelButton}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[
                                styles.saveButton,
                                (!canSave || isSaving) && styles.saveButtonDisabled,
                            ]}
                            disabled={!canSave || isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {isEditing ? 'Cập nhật' : 'Tạo'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    titleInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1f2937',
    },
    contentInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1f2937',
        minHeight: 200,
    },
    charCount: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'right',
        marginTop: 4,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});

export default CreateNoteModal;
