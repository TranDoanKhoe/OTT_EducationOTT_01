// @ts-nocheck
// NoteItem - Component hiển thị một note
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Note {
    id: string;
    title: string;
    content: string;
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
}

interface NoteItemProps {
    note: Note;
    currentUserId: string;
    isAdmin: boolean;
    onEdit: (note: Note) => void;
    onDelete: (noteId: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({
    note,
    currentUserId,
    isAdmin,
    onEdit,
    onDelete,
}) => {
    const canEdit = isAdmin || note.createdBy === currentUserId;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="note" size={20} color="#f59e0b" />
                <Text style={styles.title} numberOfLines={1}>
                    {note.title}
                </Text>
                {canEdit && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={() => onEdit(note)}
                            style={styles.actionButton}
                        >
                            <MaterialIcons name="edit" size={18} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onDelete(note.id)}
                            style={styles.actionButton}
                        >
                            <MaterialIcons name="delete" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <Text style={styles.content} numberOfLines={3}>
                {note.content}
            </Text>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                </Text>
                {note.updatedAt && note.updatedAt !== note.createdAt && (
                    <Text style={styles.editedText}>• Đã chỉnh sửa</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 4,
    },
    content: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    editedText: {
        fontSize: 12,
        color: '#6b7280',
        fontStyle: 'italic',
    },
});

export default NoteItem;
