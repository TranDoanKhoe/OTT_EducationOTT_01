// @ts-nocheck
// ChatInput - Component thanh nhập tin nhắn (tương tự ChatWindow input trên Web)
import React, { useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    Text,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ReplyPreview from './ReplyPreview';
import VoiceRecorder from './VoiceRecorder';

interface ChatInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onAttachFile?: () => void;
    onAttachImage?: () => void;
    onOpenEmoji?: () => void;
    onSendVoice?: (uri: string, duration: number) => void;
    placeholder?: string;
    disabled?: boolean;
    replyTo?: any;
    onCancelReply?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChangeText,
    onSend,
    onAttachFile,
    onAttachImage,
    onOpenEmoji,
    onSendVoice,
    placeholder = 'Nhập tin nhắn...',
    disabled = false,
    replyTo,
    onCancelReply,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const handleSend = () => {
        if (value.trim() && !disabled) {
            onSend();
        }
    };

    const handleVoiceSend = (uri: string, duration: number) => {
        setIsRecording(false);
        if (onSendVoice) {
            onSendVoice(uri, duration);
        }
    };

    const handleVoiceCancel = () => {
        setIsRecording(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Reply preview */}
            {replyTo && !isRecording && (
                <ReplyPreview
                    message={replyTo}
                    onCancel={onCancelReply}
                />
            )}

            {/* Voice Recorder UI */}
            {isRecording && onSendVoice && (
                <VoiceRecorder
                    onSend={handleVoiceSend}
                    onCancel={handleVoiceCancel}
                />
            )}

            {/* Normal Input UI */}
            {!isRecording && (
                <View style={[
                    styles.container,
                    isFocused && styles.containerFocused,
                    disabled && styles.containerDisabled,
                ]}>
                    {/* Attach buttons */}
                    <View style={styles.attachButtons}>
                        {onAttachImage && (
                            <TouchableOpacity
                                onPress={onAttachImage}
                                style={styles.iconButton}
                                disabled={disabled}
                            >
                                <MaterialIcons name="image" size={24} color="#10b981" />
                            </TouchableOpacity>
                        )}
                        {onAttachFile && (
                            <TouchableOpacity
                                onPress={onAttachFile}
                                style={styles.iconButton}
                                disabled={disabled}
                            >
                                <MaterialIcons name="attach-file" size={24} color="#10b981" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Text input */}
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={2000}
                        editable={!disabled}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />

                    {/* Right buttons */}
                    <View style={styles.rightButtons}>
                        {onOpenEmoji && !value.trim() && (
                            <TouchableOpacity
                                onPress={onOpenEmoji}
                                style={styles.iconButton}
                                disabled={disabled}
                            >
                                <MaterialIcons name="emoji-emotions" size={24} color="#10b981" />
                            </TouchableOpacity>
                        )}

                        {value.trim() ? (
                            <TouchableOpacity
                                onPress={handleSend}
                                style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
                                disabled={disabled}
                            >
                                <MaterialIcons name="send" size={20} color="#fff" />
                            </TouchableOpacity>
                        ) : onSendVoice ? (
                            <TouchableOpacity
                                onPress={() => setIsRecording(true)}
                                style={styles.iconButton}
                                disabled={disabled}
                            >
                                <MaterialIcons name="mic" size={24} color="#10b981" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 8,
    },
    containerFocused: {
        borderTopColor: '#10b981',
    },
    containerDisabled: {
        opacity: 0.6,
        backgroundColor: '#f9fafb',
    },
    attachButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    iconButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111827',
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sendButton: {
        backgroundColor: '#10b981',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
});

export default ChatInput;
