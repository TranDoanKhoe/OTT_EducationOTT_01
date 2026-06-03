const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const useWebRTCMock =
    process.env.EXPO_PUBLIC_USE_WEBRTC_MOCK === 'true' ||
    process.env.USE_WEBRTC_MOCK === 'true';

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (useWebRTCMock && moduleName === 'react-native-webrtc') {
        return {
            filePath: path.resolve(__dirname, 'src/mocks/react-native-webrtc.js'),
            type: 'sourceFile',
        };
    }

    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
