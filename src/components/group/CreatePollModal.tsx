// @ts-nocheck
// CreatePollModal - Modal tạo poll mới
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CreatePollModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (pollData: any) => Promise<void>;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({
    visible,
    onClose,
    onCreate,
}) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleCreate = async () => {
        // Validation
        if (!question.trim()) {
            return;
        }

        const validOptions = options.filter((opt) => opt.trim());
        if (validOptions.length < 2) {
            return;
        }

        setIsCreating(true);
        try {
            await onCreate({
                question: question.trim(),
                options: validOptions,
                allowMultiple,
            });

            // Reset form
            setQuestion('');
            setOptions(['', '']);
            setAllowMultiple(false);
            onClose();
        } catch (error) {
            console.error('Error creating poll:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const canCreate =
        question.trim() && options.filter((opt) => opt.trim()).length >= 2;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Tạo bình chọn</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Question */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Câu hỏi *</Text>
                            <TextInput
                                style={styles.questionInput}
                                placeholder="Nhập câu hỏi..."
                                value={question}
                                onChangeText={setQuestion}
                                multiline
                                maxLength={200}
                            />
                        </View>

                        {/* Options */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Các lựa chọn *</Text>
                            {options.map((option, index) => (
                                <View key={index} style={styles.optionRow}>
                                    <TextInput
                                        style={styles.optionInput}
                                        placeholder={`Lựa chọn ${index + 1}`}
                                        value={option}
                                        onChangeText={(value) =>
                                            handleOptionChange(index, value)
                                        }
                                        maxLength={100}
                                    />
                                    {options.length > 2 && (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveOption(index)}
                                            style={styles.removeButton}
                                        >
                                            <MaterialIcons
                                                name="close"
                                                size={20}
                                                color="#ef4444"
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {options.length < 10 && (
                                <TouchableOpacity
                                    onPress={handleAddOption}
                                    style={styles.addButton}
                                >
                                    <MaterialIcons
                                        name="add"
                                        size={20}
                                        color="#3b82f6"
                                    />
                                    <Text style={styles.addButtonText}>
                                        Thêm lựa chọn
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Settings */}
                        <View style={styles.section}>
                            <View style={styles.settingRow}>
                                <View style={styles.settingInfo}>
                                    <Text style={styles.settingLabel}>
                                        Cho phép chọn nhiều đáp án
                                    </Text>
                                    <Text style={styles.settingDescription}>
                                        Người dùng có thể chọn nhiều lựa chọn
                                    </Text>
                                </View>
                                <Switch
                                    value={allowMultiple}
                                    onValueChange={setAllowMultiple}
                                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                    thumbColor={allowMultiple ? '#3b82f6' : '#f3f4f6'}
                                />
                            </View>
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
                            onPress={handleCreate}
                            style={[
                                styles.createButton,
                                (!canCreate || isCreating) &&
                                    styles.createButtonDisabled,
                            ]}
                            disabled={!canCreate || isCreating}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.createButtonText}>Tạo</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
    questionInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1f2937',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    optionInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1f2937',
    },
    removeButton: {
        padding: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    addButtonText: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '500',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingInfo: {
        flex: 1,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 13,
        color: '#6b7280',
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
    createButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});

export default CreatePollModal;
