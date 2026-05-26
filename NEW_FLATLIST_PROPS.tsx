// ============================================
// UPDATE FLATLIST COMPONENT
// Find <FlatList and add these props
// ============================================

<FlatList
    ref={flatListRef}
    data={messages}
    keyExtractor={(item) => item.id?.toString() || item.tempKey}
    renderItem={renderMessage}
    inverted
    // ✅ ADD INFINITE SCROLL:
    onEndReached={async () => {
        if (hasMoreHistory && !isLoadingMore) {
            const olderMessages = await loadMoreMessages();
            if (olderMessages && olderMessages.length > 0) {
                setMessages((prev) => [...prev, ...olderMessages]);
            }
        }
    }}
    onEndReachedThreshold={0.5}
    ListFooterComponent={
        isLoadingMore ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={{ color: '#6b7280', marginTop: 8, fontSize: 12 }}>
                    Đang tải tin nhắn cũ...
                </Text>
            </View>
        ) : null
    }
    // KEEP EXISTING:
    onScrollToIndexFailed={({ index }) => {
        const safeIndex = Math.max(0, index - 1);
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({
                index: safeIndex,
                animated: true,
            });
        }, 250);
    }}
    contentContainerStyle={styles.messageList}
    showsVerticalScrollIndicator={false}
/>
