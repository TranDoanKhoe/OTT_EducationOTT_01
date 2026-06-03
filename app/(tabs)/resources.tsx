// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
    createNewFolder,
    fetchShareTargets,
    fetchStorage,
    listResources,
    openResourceFile,
    removeResource,
    shareOneResource,
    uploadNewResource,
} from '../../src/services/resourceService';
import { formatFileSize, getFileCategory } from '../../src/api/resourceApi';

const CATEGORY_ITEMS = ['all', 'documents', 'images', 'videos', 'audio'];

export default function ResourcesTabScreen() {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [storageInfo, setStorageInfo] = useState({ used: 0, total: 5 * 1024 * 1024 * 1024 });

    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderName, setFolderName] = useState('');

    const [previewItem, setPreviewItem] = useState(null);

    const [shareItem, setShareItem] = useState(null);
    const [shareType, setShareType] = useState('user');
    const [shareSearch, setShareSearch] = useState('');
    const [sharing, setSharing] = useState(false);
    const [targets, setTargets] = useState({ friends: [], groups: [] });

    const load = useCallback(async () => {
        try {
            const [rows, storage] = await Promise.all([listResources('all'), fetchStorage()]);
            setItems(rows || []);
            setStorageInfo(storage || { used: 0, total: 5 * 1024 * 1024 * 1024 });
        } catch (error) {
            Alert.alert('Error', error?.message || 'Cannot load resources');
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const onUpload = async () => {
        try {
            const picked = await DocumentPicker.getDocumentAsync({
                multiple: true,
                copyToCacheDirectory: true,
            });
            if (picked.canceled) return;

            setUploading(true);
            for (const asset of picked.assets || []) {
                await uploadNewResource(asset);
            }
            await load();
        } catch (error) {
            Alert.alert('Upload failed', error?.message || 'Cannot upload file');
        } finally {
            setUploading(false);
        }
    };

    const onCreateFolder = async () => {
        if (!folderName.trim()) {
            Alert.alert('Missing name', 'Please input folder name');
            return;
        }
        try {
            await createNewFolder(folderName.trim());
            setFolderName('');
            setShowFolderModal(false);
            await load();
        } catch (error) {
            Alert.alert('Error', error?.message || 'Cannot create folder');
        }
    };

    const onDelete = async (item) => {
        Alert.alert('Delete', `Delete "${item.name || item.fileName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await removeResource(item.id);
                        setItems((prev) => prev.filter((x) => x.id !== item.id));
                    } catch (error) {
                        Alert.alert('Error', error?.message || 'Delete failed');
                    }
                },
            },
        ]);
    };

    const openShare = async (item) => {
        try {
            setShareItem(item);
            setShareSearch('');
            setShareType('user');
            const data = await fetchShareTargets();
            setTargets({
                friends: data?.friends || [],
                groups: (data?.groups || []).filter((g) => String(g?.groupType || '').toUpperCase() !== 'PRIVATE'),
            });
        } catch (error) {
            Alert.alert('Error', error?.message || 'Cannot load share targets');
        }
    };

    const onShareToTarget = async (target) => {
        if (!shareItem?.id || !target?.id) return;
        try {
            setSharing(true);
            await shareOneResource(shareItem.id, target.id, shareType);
            Alert.alert('Success', 'Shared successfully');
            setShareItem(null);
        } catch (error) {
            Alert.alert('Error', error?.message || 'Share failed');
        } finally {
            setSharing(false);
        }
    };

    const filtered = useMemo(() => {
        return (items || []).filter((item) => {
            const name = String(item?.name || item?.fileName || '');
            const inSearch = name.toLowerCase().includes(search.toLowerCase());
            if (!inSearch) return false;
            if (category === 'all') return true;
            if (item?.isFolder) return true;
            return getFileCategory(name) === category;
        });
    }, [items, search, category]);

    const shareCandidates = useMemo(() => {
        const rows = shareType === 'user' ? targets.friends : targets.groups;
        return rows.filter((item) => {
            const label =
                shareType === 'user'
                    ? `${item?.firstName || ''} ${item?.lastName || ''}`.trim() || item?.name || ''
                    : item?.name || '';
            return label.toLowerCase().includes(shareSearch.toLowerCase());
        });
    }, [shareSearch, shareType, targets]);

    const usedPercent = Math.min(
        100,
        Math.round(((storageInfo?.used || 0) / (storageInfo?.total || 1)) * 100),
    );

    const renderItem = ({ item }) => {
        const isFolder = item?.isFolder;
        const itemName = item?.name || item?.fileName || 'Untitled';
        const isImage = !isFolder && getFileCategory(itemName) === 'images';

        return (
            <View style={styles.card}>
                <TouchableOpacity
                    style={styles.cardLeft}
                    onPress={() => {
                        if (isFolder) return;
                        if (isImage) {
                            setPreviewItem(item);
                            return;
                        }
                        openResourceFile(item);
                    }}
                >
                    <View style={styles.iconWrap}>
                        <MaterialIcons
                            name={isFolder ? 'folder' : 'insert-drive-file'}
                            size={20}
                            color={isFolder ? '#0f766e' : '#1d4ed8'}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {itemName}
                        </Text>
                        <Text style={styles.cardMeta}>
                            {isFolder
                                ? 'Folder'
                                : `${formatFileSize(item?.size || 0)} • ${item?.category || 'documents'}`}
                        </Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.cardActions}>
                    {!isFolder && (
                        <TouchableOpacity
                            onPress={() => {
                                if (isImage) {
                                    setPreviewItem(item);
                                } else {
                                    openResourceFile(item);
                                }
                            }}
                            style={styles.iconBtn}
                        >
                            <MaterialIcons name="visibility" size={18} color="#0f766e" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => openShare(item)} style={styles.iconBtn}>
                        <MaterialIcons name="share" size={18} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDelete(item)} style={styles.iconBtn}>
                        <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Resources</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowFolderModal(true)}>
                        <MaterialIcons name="create-new-folder" size={22} color="#0f766e" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={onUpload}>
                        {uploading ? (
                            <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                            <MaterialIcons name="upload-file" size={22} color="#0f766e" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.storageWrap}>
                <Text style={styles.storageText}>
                    Storage: {formatFileSize(storageInfo?.used || 0)} / {formatFileSize(storageInfo?.total || 0)}
                </Text>
                <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${usedPercent}%` }]} />
                </View>
            </View>

            <View style={styles.searchRow}>
                <TextInput value={search} onChangeText={setSearch} placeholder="Search resources..." style={styles.input} />
            </View>

            <View style={styles.filterRow}>
                {CATEGORY_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item}
                        onPress={() => setCategory(item)}
                        style={[styles.filterBtn, category === item && styles.filterBtnActive]}
                    >
                        <Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item, idx) => String(item?.id || idx)}
                renderItem={renderItem}
                contentContainerStyle={filtered.length ? styles.list : styles.emptyGrow}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#10b981']}
                        tintColor="#10b981"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="folder-open" size={44} color="#9ca3af" />
                        <Text style={styles.emptyText}>No resources</Text>
                    </View>
                }
            />

            <Modal visible={showFolderModal} transparent animationType="fade" onRequestClose={() => setShowFolderModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Create folder</Text>
                        <TextInput
                            value={folderName}
                            onChangeText={setFolderName}
                            placeholder="Folder name"
                            style={styles.modalInput}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setShowFolderModal(false)}>
                                <Text style={styles.modalGhostText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnPrimary} onPress={onCreateFolder}>
                                <Text style={styles.modalPrimaryText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!shareItem} transparent animationType="fade" onRequestClose={() => setShareItem(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCardLarge}>
                        <Text style={styles.modalTitle}>Share Resource</Text>
                        <View style={styles.tabRow}>
                            <TouchableOpacity
                                style={[styles.tabBtn, shareType === 'user' && styles.tabBtnActive]}
                                onPress={() => setShareType('user')}
                            >
                                <Text style={[styles.tabText, shareType === 'user' && styles.tabTextActive]}>Friends</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabBtn, shareType === 'group' && styles.tabBtnActive]}
                                onPress={() => setShareType('group')}
                            >
                                <Text style={[styles.tabText, shareType === 'group' && styles.tabTextActive]}>Groups</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            value={shareSearch}
                            onChangeText={setShareSearch}
                            placeholder="Search target..."
                            style={styles.modalInput}
                        />

                        <FlatList
                            data={shareCandidates}
                            keyExtractor={(item, idx) => String(item?.id || idx)}
                            style={{ maxHeight: 280, marginTop: 10 }}
                            renderItem={({ item }) => {
                                const label =
                                    shareType === 'user'
                                        ? `${item?.firstName || ''} ${item?.lastName || ''}`.trim() || item?.name || 'User'
                                        : item?.name || 'Group';
                                const sub = shareType === 'user' ? item?.phone || item?.email || '' : item?.classCode || '';
                                return (
                                    <TouchableOpacity
                                        style={styles.targetItem}
                                        onPress={() => onShareToTarget(item)}
                                        disabled={sharing}
                                    >
                                        <View style={styles.targetAvatar}>
                                            <Text style={styles.targetAvatarText}>{label.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.targetTitle}>{label}</Text>
                                            {sub ? <Text style={styles.targetSub}>{sub}</Text> : null}
                                        </View>
                                        {sharing ? <ActivityIndicator size="small" color="#10b981" /> : <MaterialIcons name="send" size={18} color="#10b981" />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={styles.emptyInline}>No target found</Text>}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setShareItem(null)}>
                                <Text style={styles.modalGhostText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!previewItem} transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
                <View style={styles.previewOverlay}>
                    <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewItem(null)}>
                        <MaterialIcons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    {previewItem?.fileUrl ? (
                        <Image source={{ uri: previewItem.fileUrl }} style={styles.previewImage} resizeMode="contain" />
                    ) : null}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf9' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#d1fae5',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: { fontSize: 20, fontWeight: '700', color: '#065f46' },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ecfdf5',
    },
    storageWrap: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
    storageText: { fontSize: 12, color: '#4b5563', marginBottom: 6 },
    progressBg: { height: 8, borderRadius: 999, backgroundColor: '#d1fae5', overflow: 'hidden' },
    progressFill: { height: 8, backgroundColor: '#10b981' },
    searchRow: { paddingHorizontal: 12, paddingVertical: 10 },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#a7f3d0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
    filterBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#e5e7eb',
    },
    filterBtnActive: { backgroundColor: '#10b981' },
    filterText: { fontSize: 12, color: '#374151', textTransform: 'capitalize' },
    filterTextActive: { color: '#fff', fontWeight: '600' },
    list: { paddingHorizontal: 12, paddingBottom: 18 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1fae5',
        padding: 12,
        marginBottom: 9,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: '#ecfdf5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
    cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
    iconBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
    },
    emptyGrow: { flexGrow: 1 },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { marginTop: 10, color: '#6b7280' },
    emptyInline: { textAlign: 'center', color: '#6b7280', paddingVertical: 18 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 22 },
    modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
    modalCardLarge: { backgroundColor: '#fff', borderRadius: 14, padding: 14, maxHeight: '80%' },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
    modalInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    modalActions: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    modalBtnGhost: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
    modalGhostText: { color: '#374151', fontWeight: '600' },
    modalBtnPrimary: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#10b981' },
    modalPrimaryText: { color: '#fff', fontWeight: '600' },

    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    tabBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#e5e7eb' },
    tabBtnActive: { backgroundColor: '#10b981' },
    tabText: { color: '#374151', fontWeight: '600', fontSize: 12 },
    tabTextActive: { color: '#fff' },
    targetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
    },
    targetAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    targetAvatarText: { color: '#065f46', fontWeight: '700' },
    targetTitle: { color: '#111827', fontWeight: '600', fontSize: 13 },
    targetSub: { color: '#6b7280', fontSize: 12, marginTop: 1 },

    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    previewClose: {
        position: 'absolute',
        top: 42,
        right: 18,
        zIndex: 1,
    },
    previewImage: {
        width: '100%',
        height: '82%',
    },
});
