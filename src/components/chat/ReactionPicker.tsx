// @ts-nocheck
// ReactionPicker - Modal chọn emoji để react
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Pressable,
} from 'react-native';

interface ReactionPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectEmoji: (emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ReactionPicker: React.FC<ReactionPickerProps> = ({
    visible,
    onClose,
    onSelectEmoji,
}) => {
    const handleSelect = (emoji: string) => {
        onSelectEmoji(emoji);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.title}>Thả cảm xúc</Text>
                        <View style={styles.emojiGrid}>
                            {QUICK_REACTIONS.map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    style={styles.emojiButton}
                                    onPress={() => handleSelect(emoji)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.emoji}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '80%',
        maxWidth: 300,
    },
    content: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    emojiButton: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    emoji: {
        fontSize: 28,
    },
});

export default ReactionPicker;
