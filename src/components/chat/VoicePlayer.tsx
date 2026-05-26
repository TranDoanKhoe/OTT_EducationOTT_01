// @ts-nocheck
// VoicePlayer - Component phát tin nhắn thoại
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface VoicePlayerProps {
    voiceUrl: string;
    duration?: number;
    style?: any;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
    voiceUrl,
    duration: initialDuration,
    style,
}) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const [isLoading, setIsLoading] = useState(false);

    const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
            if (positionUpdateRef.current) {
                clearInterval(positionUpdateRef.current);
            }
        };
    }, [sound]);

    const loadSound = async () => {
        try {
            setIsLoading(true);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: voiceUrl },
                { shouldPlay: false }
            );

            const status = await newSound.getStatusAsync();
            if (status.isLoaded && status.durationMillis) {
                setDuration(Math.floor(status.durationMillis / 1000));
            }

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(Math.floor((status.positionMillis || 0) / 1000));
                    setIsPlaying(status.isPlaying);

                    if (status.didJustFinish) {
                        setPosition(0);
                        setIsPlaying(false);
                    }
                }
            });

            setSound(newSound);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading sound:', error);
            setIsLoading(false);
        }
    };

    const handlePlayPause = async () => {
        if (!sound) {
            await loadSound();
            return;
        }

        try {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
        } catch (error) {
            console.error('Error playing/pausing sound:', error);
        }
    };

    const handleSeek = async (value: number) => {
        if (!sound) return;

        try {
            await sound.setPositionAsync(value * 1000);
            setPosition(value);
        } catch (error) {
            console.error('Error seeking:', error);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, style]}>
            <TouchableOpacity
                onPress={handlePlayPause}
                style={styles.playButton}
                disabled={isLoading}
            >
                <MaterialIcons
                    name={isPlaying ? 'pause' : 'play-arrow'}
                    size={28}
                    color="#3b82f6"
                />
            </TouchableOpacity>

            <View style={styles.progressContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration}
                    value={position}
                    onSlidingComplete={handleSeek}
                    minimumTrackTintColor="#3b82f6"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#3b82f6"
                />
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 12,
        minWidth: 240,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    progressContainer: {
        flex: 1,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -8,
    },
    timeText: {
        fontSize: 11,
        color: '#6b7280',
    },
});

export default VoicePlayer;
