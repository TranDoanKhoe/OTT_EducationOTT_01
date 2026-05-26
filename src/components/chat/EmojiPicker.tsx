// @ts-nocheck
// EmojiPicker - Component chọn emoji
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const EMOJI_CATEGORIES = {
    smileys: {
        name: 'Mặt cười',
        icon: 'emoji-emotions',
        emojis: [
            '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
            '😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗',
            '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
        ],
    },
    gestures: {
        name: 'Cử chỉ',
        icon: 'back-hand',
        emojis: [
            '👍','👎','👏','🙌','🤝','🤜','🤛','✊','👊','🤚',
            '✋','🖐','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘',
        ],
    },
    hearts: {
        name: 'Trái tim',
        icon: 'favorite',
        emojis: [
            '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
            '❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','💟','❣️',
        ],
    },
    symbols: {
        name: 'Biểu tượng',
        icon: 'star',
        emojis: [
            '💯','✅','❌','⭐','🔥','💥','🎉','🎊','🎈','🎁',
            '🏆','🥇','🥈','🥉','⚡','💫','✨','🌟','💢','💬',
        ],
    },
};

interface EmojiPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ visible, onClose, onSelect }) => {
    const [activeCategory, setActiveCategory] = React.useState('smileys');

    const handleSelect = (emoji: string) => {
        onSelect(emoji);
        // Don't close automatically - let user pick multiple emojis
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Chọn emoji</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Category tabs */}
                    <View style={styles.categoryTabs}>
                        {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                            <TouchableOpacity
                                key={key}
                                onPress={() => setActiveCategory(key)}
                                style={[
                                    styles.categoryTab,
                                    activeCategory === key && styles.categoryTabActive,
                                ]}
                            >
                                <MaterialIcons
                                    name={category.icon}
                                    size={24}
                                    color={activeCategory === key ? '#10b981' : '#9ca3af'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Emoji grid */}
                    <ScrollView style={styles.emojiGrid} showsVerticalScrollIndicator={false}>
                        <View style={styles.emojiRow}>
                            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleSelect(emoji)}
                                    style={styles.emojiButton}
                                >
                                    <Text style={styles.emoji}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </TouchableOpacity>
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
        maxHeight: '60%',
        paddingBottom: 20,
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
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    categoryTabs: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 8,
    },
    categoryTab: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f9fafb',
    },
    categoryTabActive: {
        backgroundColor: '#d1fae5',
    },
    emojiGrid: {
        paddingHorizontal: 12,
        paddingTop: 12,
    },
    emojiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    emojiButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    emoji: {
        fontSize: 28,
    },
});

export default EmojiPicker;
