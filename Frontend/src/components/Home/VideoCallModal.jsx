import { useState, useEffect, useRef } from 'react';
import {
    BiMicrophone,
    BiMicrophoneOff,
    BiVideo,
    BiVideoOff,
    BiPhoneOff,
} from 'react-icons/bi';

const VideoCallModal = ({
    open,
    onClose,
    contact,
    isVideoCall,
    localStream,
    remoteStream,
    onToggleAudio,
    onToggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    callStatus,
}) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(() => {
                // Autoplay can be blocked by browser policies in some cases.
            });
        }
    }, [localStream, remoteStream, isVideoCall, isVideoEnabled, open]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => {
                // Autoplay can be blocked by browser policies in some cases.
            });
        }
    }, [remoteStream]);

    useEffect(() => {
        if (!isVideoCall && remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {
                // Autoplay can be blocked by browser policies in some cases.
            });
        }
    }, [isVideoCall, remoteStream]);

    const handleEndCall = () => {
        onClose();
    };

    return (
        <>
            {open && (
                <div className="fixed inset-0 bg-[#1c1c1e] z-50 flex items-center justify-center">
                    <div className="relative w-full h-full bg-[#1c1c1e] flex flex-col items-center justify-center">
                        {remoteStream ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {isVideoCall && (
                                    <>
                                        <video
                                            ref={remoteVideoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                        {localStream && isVideoEnabled && (
                                            <video
                                                ref={localVideoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="absolute top-3 right-3 sm:top-5 sm:right-5 w-[120px] h-[90px] sm:w-[160px] sm:h-[120px] md:w-[200px] md:h-[150px] object-cover rounded-lg border-2 border-white z-10"
                                            />
                                        )}
                                    </>
                                )}
                                {!isVideoCall && (
                                    <div className="text-center text-white mb-10">
                                        <audio
                                            ref={remoteAudioRef}
                                            autoPlay
                                            playsInline
                                        />
                                        {contact?.avatar ? (
                                            <img
                                                src={contact.avatar}
                                                alt={contact.name}
                                                className="w-[96px] h-[96px] sm:w-[120px] sm:h-[120px] rounded-full mx-auto mb-5 text-4xl sm:text-5xl object-cover"
                                            />
                                        ) : (
                                            <div className="w-[96px] h-[96px] sm:w-[120px] sm:h-[120px] rounded-full mx-auto mb-5 bg-[#0068ff] text-white flex items-center justify-center text-4xl sm:text-5xl">
                                                {contact?.name?.charAt(0)}
                                            </div>
                                        )}
                                        <h2 className="text-xl sm:text-2xl mb-2">
                                            {contact?.name}
                                        </h2>
                                        <p className="text-[#8e8e93]">
                                            {callStatus || 'Đang kết nối...'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-white mb-10">
                                {contact?.avatar ? (
                                    <img
                                        src={contact.avatar}
                                        alt={contact.name}
                                        className="w-[96px] h-[96px] sm:w-[120px] sm:h-[120px] rounded-full mx-auto mb-5 text-4xl sm:text-5xl object-cover"
                                    />
                                ) : (
                                    <div className="w-[96px] h-[96px] sm:w-[120px] sm:h-[120px] rounded-full mx-auto mb-5 bg-[#0068ff] text-white flex items-center justify-center text-4xl sm:text-5xl">
                                        {contact?.name?.charAt(0)}
                                    </div>
                                )}
                                <h2 className="text-xl sm:text-2xl mb-2">
                                    {contact?.name}
                                </h2>
                                <p className="text-[#8e8e93]">
                                    {callStatus || 'Đang gọi...'}
                                </p>
                            </div>
                        )}

                        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-3 sm:gap-5 z-10">
                            <button
                                onClick={onToggleAudio}
                                title="Tắt/Bật mic"
                                className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full bg-[#3a3a3c] text-white hover:bg-[#48484a] flex items-center justify-center transition-colors"
                            >
                                {isAudioEnabled ? (
                                    <BiMicrophone
                                        size={24}
                                        className="sm:w-7 sm:h-7"
                                    />
                                ) : (
                                    <BiMicrophoneOff
                                        size={24}
                                        className="sm:w-7 sm:h-7"
                                    />
                                )}
                            </button>

                            {isVideoCall && (
                                <button
                                    onClick={onToggleVideo}
                                    title="Tắt/Bật camera"
                                    className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full bg-[#3a3a3c] text-white hover:bg-[#48484a] flex items-center justify-center transition-colors"
                                >
                                    {isVideoEnabled ? (
                                        <BiVideo
                                            size={24}
                                            className="sm:w-7 sm:h-7"
                                        />
                                    ) : (
                                        <BiVideoOff
                                            size={24}
                                            className="sm:w-7 sm:h-7"
                                        />
                                    )}
                                </button>
                            )}

                            <button
                                onClick={handleEndCall}
                                title="Kết thúc cuộc gọi"
                                className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full bg-[#ff3b30] text-white hover:bg-[#d32f2f] flex items-center justify-center transition-colors"
                            >
                                <BiPhoneOff
                                    size={24}
                                    className="sm:w-7 sm:h-7"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VideoCallModal;
