// @ts-nocheck
// PollItem - Component hiển thị một poll
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface PollOption {
    text: string;
    votes: number;
    voters: string[];
}

interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    allowMultiple: boolean;
    createdBy: string;
    createdAt: string;
    totalVotes: number;
}

interface PollItemProps {
    poll: Poll;
    currentUserId: string;
    onVote: (pollId: string, optionIndex: number) => void;
    style?: any;
}

const PollItem: React.FC<PollItemProps> = ({ poll, currentUserId, onVote, style }) => {
    const hasVoted = poll.options.some((opt) => opt.voters.includes(currentUserId));
    const userVotes = poll.options
        .map((opt, idx) => (opt.voters.includes(currentUserId) ? idx : -1))
        .filter((idx) => idx !== -1);

    const handleVote = (optionIndex: number) => {
        if (!poll.allowMultiple && hasVoted && !userVotes.includes(optionIndex)) {
            // Already voted, can't vote again
            return;
        }
        onVote(poll.id, optionIndex);
    };

    const getPercentage = (votes: number) => {
        if (poll.totalVotes === 0) return 0;
        return Math.round((votes / poll.totalVotes) * 100);
    };

    return (
        <View style={[styles.container, style]}>
            {/* Question */}
            <View style={styles.header}>
                <MaterialIcons name="poll" size={20} color="#3b82f6" />
                <Text style={styles.question}>{poll.question}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
                {poll.options.map((option, index) => {
                    const percentage = getPercentage(option.votes);
                    const isSelected = userVotes.includes(index);

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleVote(index)}
                            style={[
                                styles.option,
                                isSelected && styles.optionSelected,
                            ]}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionContent}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        { width: `${percentage}%` },
                                    ]}
                                />
                                <View style={styles.optionTextContainer}>
                                    <Text
                                        style={[
                                            styles.optionText,
                                            isSelected && styles.optionTextSelected,
                                        ]}
                                    >
                                        {option.text}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.optionVotes,
                                            isSelected && styles.optionVotesSelected,
                                        ]}
                                    >
                                        {percentage}% ({option.votes})
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {poll.totalVotes} lượt bình chọn
                </Text>
                {poll.allowMultiple && (
                    <Text style={styles.multipleText}>• Chọn nhiều đáp án</Text>
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
        marginBottom: 16,
    },
    question: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    optionsContainer: {
        gap: 10,
        marginBottom: 12,
    },
    option: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    optionSelected: {
        borderColor: '#3b82f6',
        borderWidth: 2,
    },
    optionContent: {
        position: 'relative',
        minHeight: 44,
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#dbeafe',
    },
    optionTextContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        zIndex: 1,
    },
    optionText: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
        marginRight: 8,
    },
    optionTextSelected: {
        fontWeight: '600',
        color: '#1e40af',
    },
    optionVotes: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    optionVotesSelected: {
        color: '#1e40af',
        fontWeight: '600',
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
    multipleText: {
        fontSize: 12,
        color: '#3b82f6',
    },
});

export default PollItem;
