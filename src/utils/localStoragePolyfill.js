import { Platform } from 'react-native';

// Kiểm tra nền tảng đang chạy (Web hay Mobile Native)
const isWeb = Platform.OS === 'web';

// Nếu là Web: dùng localStorage thật của trình duyệt
// Nếu là Native (Android/iOS): dùng AsyncStorage
class LocalStoragePolyfill {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        // Nếu là web thì coi như đã init (không cần load async)
        if (isWeb) {
            this.isInitialized = true;
            this.initPromise = Promise.resolve();
        } else {
            this.initPromise = this._initNative();
        }
    }

    // Đọc tất cả keys từ AsyncStorage vào bộ nhớ cache khi khởi động (chỉ dùng trên Native)
    async _initNative() {
        if (this.isInitialized) return;
        try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            this._asyncStorage = AsyncStorage;
            const keys = await AsyncStorage.getAllKeys();
            if (keys && keys.length > 0) {
                const pairs = await AsyncStorage.multiGet(keys);
                pairs.forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
            }
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AsyncStorage cache', error);
        }
    }

    getItem(key) {
        // Nếu Web: đọc trực tiếp từ localStorage trình duyệt
        if (isWeb) {
            try {
                return window.localStorage.getItem(key);
            } catch (_error) {
                return null;
            }
        }
        // Native: đọc từ cache trong bộ nhớ (đã sync lúc init)
        return this.cache.has(key) ? this.cache.get(key) : null;
    }

    setItem(key, value) {
        const valStr = String(value);
        if (isWeb) {
            // Web: lưu vào localStorage trình duyệt
            try {
                window.localStorage.setItem(key, valStr);
            } catch (error) {
                console.error('localStorage setItem error', error);
            }
            return;
        }
        // Native: lưu vào cache và đồng bộ xuống AsyncStorage
        this.cache.set(key, valStr);
        if (this._asyncStorage) {
            this._asyncStorage.setItem(key, valStr).catch((error) =>
                console.error('AsyncStorage setItem error', error)
            );
        }
    }

    removeItem(key) {
        if (isWeb) {
            try {
                window.localStorage.removeItem(key);
            } catch (_error) {}
            return;
        }
        this.cache.delete(key);
        if (this._asyncStorage) {
            this._asyncStorage.removeItem(key).catch((error) =>
                console.error('AsyncStorage removeItem error', error)
            );
        }
    }

    clear() {
        if (isWeb) {
            try {
                window.localStorage.clear();
            } catch (_error) {}
            return;
        }
        this.cache.clear();
        if (this._asyncStorage) {
            this._asyncStorage.clear().catch((error) =>
                console.error('AsyncStorage clear error', error)
            );
        }
    }
}

const localStorage = new LocalStoragePolyfill();
export default localStorage;

