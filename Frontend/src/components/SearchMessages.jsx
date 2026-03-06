import React, { useState, useEffect } from 'react';
import { BiSearch, BiX } from 'react-icons/bi';
import { searchMessages } from '../api/messageApi';
import { toast } from 'react-toastify';

const SearchMessages = ({
    userId,
    selectedContact,
    token,
    onSelectMessage,
    onClose,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Tự động tìm kiếm khi searchQuery thay đổi
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchQuery.trim() && token) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(delaySearch);
    }, [searchQuery, token]);

    const handleSearch = async () => {
        if (!searchQuery.trim() || !token) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchMessages(
                userId,
                selectedContact.isGroup ? null : selectedContact.id,
                selectedContact.isGroup ? selectedContact.id : null,
                searchQuery,
                token,
            );
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching messages:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        onClose();
    };

    return (
        <div className="p-3 border-b border-gray-200">
            <div className="relative mb-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <BiSearch size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Tìm kiếm tin nhắn"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent text-sm"
                />
                {searchQuery && (
                    <button
                        onClick={handleClearSearch}
                        disabled={isSearching}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <BiX size={20} className="text-gray-500" />
                    </button>
                )}
            </div>

            {searchResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {searchResults.map((message) => (
                        <div
                            key={message.id}
                            onClick={() => onSelectMessage(message)}
                            className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        >
                            <p className="text-sm text-gray-900 mb-1 line-clamp-2">
                                {message.content}
                            </p>
                            <p className="text-xs text-gray-500">
                                Từ:{' '}
                                {selectedContact.isGroup
                                    ? message.senderId === userId
                                        ? 'Bạn'
                                        : message.senderId
                                    : message.senderId === userId
                                      ? 'Bạn'
                                      : selectedContact.name}{' '}
                                - {new Date(message.createAt).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
            {searchQuery.trim() &&
                searchResults.length === 0 &&
                !isSearching && (
                    <p className="text-center text-sm text-gray-500 py-4">
                        Không tìm thấy tin nhắn nào khớp với "{searchQuery}"
                    </p>
                )}
        </div>
    );
};

export default SearchMessages;
