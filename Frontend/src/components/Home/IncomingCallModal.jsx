import { BiPhoneOff, BiPhoneCall } from 'react-icons/bi';

const IncomingCallModal = ({
    open,
    caller,
    isVideoCall,
    onAccept,
    onReject,
}) => {
    return (
        <>
            {open && (
                <div className="fixed inset-0 bg-[#1c1c1e] z-50 flex items-center justify-center">
                    <div className="relative w-full h-full bg-[#1c1c1e] flex flex-col items-center justify-center p-6 sm:p-10">
                        <div className="text-center text-white mb-12 sm:mb-16">
                            {caller?.avatar ? (
                                <img
                                    src={caller.avatar}
                                    alt={caller.name}
                                    className="w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] rounded-full border-4 border-white object-cover mx-auto mb-6 sm:mb-8"
                                />
                            ) : (
                                <div className="w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] rounded-full border-4 border-white bg-[#0068ff] text-white flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-6 sm:mb-8">
                                    {caller?.name?.charAt(0)}
                                </div>
                            )}
                            <h2 className="text-2xl sm:text-4xl mb-2 font-semibold">
                                {caller?.name || 'Unknown'}
                            </h2>
                            <p className="text-[#8e8e93] text-base sm:text-lg mt-2.5 animate-pulse">
                                {isVideoCall
                                    ? 'Cuộc gọi video đến...'
                                    : 'Cuộc gọi thoại đến...'}
                            </p>
                        </div>

                        <div className="flex gap-6 sm:gap-10">
                            <button
                                onClick={onReject}
                                title="Từ chối"
                                className="w-[56px] h-[56px] sm:w-[70px] sm:h-[70px] rounded-full bg-[#ff3b30] text-white hover:bg-[#d32f2f] flex items-center justify-center transition-colors"
                            >
                                <BiPhoneOff
                                    size={26}
                                    className="sm:w-8 sm:h-8"
                                />
                            </button>

                            <button
                                onClick={onAccept}
                                title="Chấp nhận"
                                className="w-[56px] h-[56px] sm:w-[70px] sm:h-[70px] rounded-full bg-[#34c759] text-white hover:bg-[#2fb84d] flex items-center justify-center transition-colors"
                            >
                                <BiPhoneCall
                                    size={26}
                                    className="sm:w-8 sm:h-8"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default IncomingCallModal;
