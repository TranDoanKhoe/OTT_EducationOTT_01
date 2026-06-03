// @ts-nocheck
// ImageMessage - Component hiển thị tin nhắn hình ảnh
import React, { useState } from 'react';
import {
    View,
    Image,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageMessageProps {
    imageUrl: string;
    style?: any;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ imageUrl, style }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);

            // Request permission
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({
                    type: 'error',
                    text1: 'Cần quyền truy cập thư viện ảnh',
                });
                return;
            }

            // Download image
            const fileUri = FileSystem.documentDirectory + 'image_' + Date.now() + '.jpg';
            const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

            if (downloadResult.status === 200) {
                // Save to media library
                await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
                Toast.show({
                    type: 'success',
                    text1: 'Đã lưu ảnh vào thư viện',
                });
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Error downloading image:', error);
            Toast.show({
                type: 'error',
                text1: 'Không thể tải ảnh',
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
                style={style}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
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

                    {/* Full image */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    thumbnail: {
        width: 200,
        height: 200,
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
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT - 100,
    },
});

export default ImageMessage;
