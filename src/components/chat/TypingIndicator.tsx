// @ts-nocheck
// TypingIndicator - Component hiển thị "đang nhập..."
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface TypingIndicatorProps {
    visible: boolean;
    userName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ visible, userName }) => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;

        const animateDot = (dot: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const animation = Animated.parallel([
            animateDot(dot1, 0),
            animateDot(dot2, 200),
            animateDot(dot3, 400),
        ]);

        animation.start();

        return () => animation.stop();
    }, [visible, dot1, dot2, dot3]);

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <View style={styles.bubble}>
                <View style={styles.dotsContainer}>
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                opacity: dot1,
                                transform: [
                                    {
                                        translateY: dot1.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -4],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                opacity: dot2,
                                transform: [
                                    {
                                        translateY: dot2.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -4],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                opacity: dot3,
                                transform: [
                                    {
                                        translateY: dot3.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -4],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                </View>
            </View>
            {userName && (
                <Text style={styles.userName}>{userName} đang nhập...</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    bubble: {
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomLeftRadius: 4,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#9ca3af',
    },
    userName: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 8,
        fontStyle: 'italic',
    },
});

export default TypingIndicator;
