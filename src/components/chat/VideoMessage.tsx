// @ts-nocheck
// VideoMessage - Component hiển thị tin nhắn video
import React, { useState, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

interface VideoMessageProps {
    videoUrl: string;
    thumbnailUrl?: string;
    style?: any;
}

const VideoMessage: React.FC<VideoMessageProps> = ({
    videoUrl,
    thumbnailUrl,
    style,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const videoRef = useRef<Video>(null);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);

            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({
                    type: 'error',
                    text1: 'Cần quyền truy cập thư viện',
                });
                return;
            }

            const fileUri = FileSystem.documentDirectory + 'video_' + Date.now() + '.mp4';
            const downloadResult = await FileSystem.downloadAsync(videoUrl, fileUri);

            if (downloadResult.status === 200) {
                await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
                Toast.show({
                    type: 'success',
                    text1: 'Đã lưu video vào thư viện',
                });
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Error downloading video:', error);
            Toast.show({
                type: 'error',
                text1: 'Không thể tải video',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                activeOpacity={0.9}
                style={[styles.container, style]}
            >
                <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    style={styles.thumbnail}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    usePoster
                    posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
                />
                <View style={styles.playOverlay}>
                    <MaterialIcons name="play-circle-filled" size={48} color="#fff" />
                </View>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setModalVisible(false);
                    videoRef.current?.pauseAsync();
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                setModalVisible(false);
                                videoRef.current?.pauseAsync();
                            }}
                            style={styles.closeButton}
                        >
                            <MaterialIcons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleDownload}
                            style={styles.downloadButton}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <MaterialIcons name="download" size={24} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.videoContainer}>
                        <Video
                            source={{ uri: videoUrl }}
                            style={styles.fullVideo}
                            resizeMode={ResizeMode.CONTAIN}
                            useNativeControls
                            shouldPlay
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    thumbnail: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
    },
    closeButton: {
        padding: 4,
    },
    downloadButton: {
        padding: 4,
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullVideo: {
        width: '100%',
        height: '100%',
    },
});

export default VideoMessage;
