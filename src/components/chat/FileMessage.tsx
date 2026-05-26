// @ts-nocheck
// FileMessage - Component hiển thị tin nhắn file
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

interface FileMessageProps {
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    style?: any;
}

const FileMessage: React.FC<FileMessageProps> = ({
    fileUrl,
    fileName,
    fileSize,
    style,
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const getFileIcon = () => {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'picture-as-pdf';
        if (['doc', 'docx'].includes(ext || '')) return 'description';
        if (['xls', 'xlsx'].includes(ext || '')) return 'table-chart';
        if (['ppt', 'pptx'].includes(ext || '')) return 'slideshow';
        if (['zip', 'rar'].includes(ext || '')) return 'folder-zip';
        return 'insert-drive-file';
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);

            const fileUri =
                FileSystem.documentDirectory +
                (fileName || 'file_' + Date.now());

            const downloadResult = await FileSystem.downloadAsync(
                fileUrl,
                fileUri
            );

            if (downloadResult.status === 200) {
                // Check if sharing is available
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(downloadResult.uri);
                } else {
                    // Fallback: open with system app
                    await Linking.openURL(downloadResult.uri);
                }

                Toast.show({
                    type: 'success',
                    text1: 'Đã tải file',
                });
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            Toast.show({
                type: 'error',
                text1: 'Không thể tải file',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={handleDownload}
            disabled={isDownloading}
            style={[styles.container, style]}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <MaterialIcons
                    name={getFileIcon()}
                    size={32}
                    color="#3b82f6"
                />
            </View>
            <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={2}>
                    {fileName || 'File'}
                </Text>
                {fileSize && (
                    <Text style={styles.fileSize}>
                        {formatFileSize(fileSize)}
                    </Text>
                )}
            </View>
            <View style={styles.downloadButton}>
                {isDownloading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                    <MaterialIcons
                        name="download"
                        size={24}
                        color="#3b82f6"
                    />
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 12,
        maxWidth: 280,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fileInfo: {
        flex: 1,
        marginRight: 8,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 2,
    },
    fileSize: {
        fontSize: 12,
        color: '#6b7280',
    },
    downloadButton: {
        padding: 4,
    },
});

export default FileMessage;
