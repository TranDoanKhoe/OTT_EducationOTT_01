// ============================================
// REPLACE INPUT SECTION
// Find <View style={styles.inputContainer}> and replace with this
// ============================================

<ChatInput
    value={inputText}
    onChangeText={handleInputChange}
    onSend={handleSend}
    onAttachFile={pickFile}
    onAttachImage={pickImage}
    onOpenEmoji={() => setShowEmojiPicker((v) => !v)}
    onSendVoice={handleSendVoice}
    placeholder="Nhập tin nhắn..."
    disabled={false}
    replyTo={replyToMessage}
    onCancelReply={() => setReplyToMessage(null)}
/>
