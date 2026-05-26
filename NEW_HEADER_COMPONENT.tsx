// ============================================
// REPLACE HEADER SECTION
// Find <View style={styles.header}> and replace entire section with this
// ============================================

<ChatHeader
    name={String(name || '')}
    avatar={undefined}
    isOnline={false}
    isTyping={isPeerTyping}
    onBack={() => router.back()}
    onOpenInfo={handleOpenInfo}
    onAudioCall={handleAudioCall}
    onVideoCall={handleVideoCall}
    onSearch={() => {
        setSearchBarVisible((v) => !v);
        setSearchKeyword('');
        setSearchResults([]);
    }}
    subtitle={isPrivate === 'true' ? undefined : 'Nhóm chat'}
/>
