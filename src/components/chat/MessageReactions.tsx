// @ts-nocheck
// MessageReactions - Component hiển thị reactions dưới message bubble
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Reaction {
    emoji: string;
    userIds: string[];
    count?: number;
}

interface MessageReactionsProps {
    reactions: Reaction[];
    currentUserId: string;
    onToggle: (emoji: string) => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
    reactions,
    currentUserId,
    onToggle,
}) => {
    if (!Array.isArray(reactions) || reactions.length === 0) return null;

    return (
        <View style={styles.container}>
            {reactions.map((reaction) => {
                const reacted = reaction.userIds?.includes(currentUserId);
                const count = reaction.count || reaction.userIds?.length || 0;

                return (
                    <TouchableOpacity
                        key={reaction.emoji}
                        onPress={() => onToggle(reaction.emoji)}
                        style={[
                            styles.reactionButton,
                            reacted && styles.reactionButtonActive,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.emoji}>{reaction.emoji}</Text>
                        {count > 1 && (
                            <Text
                                style={[
                                    styles.count,
                                    reacted && styles.countActive,
                                ]}
                            >
                                {count}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
        marginBottom: 2,
    },
    reactionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    reactionButtonActive: {
        backgroundColor: '#dbeafe',
        borderColor: '#93c5fd',
    },
    emoji: {
        fontSize: 14,
    },
    count: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
    },
    countActive: {
        color: '#1d4ed8',
    },
});

export default React.memo(MessageReactions);
