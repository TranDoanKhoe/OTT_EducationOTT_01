const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Redirect react-native-webrtc sang mock khi chạy Expo Go
// Khi build native (expo run:android), xóa đoạn này để dùng module thật
const _originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-webrtc') {
        return {
            filePath: path.resolve(__dirname, 'src/mocks/react-native-webrtc.js'),
            type: 'sourceFile',
        };
    }
    if (_originalResolveRequest) {
        return _originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
