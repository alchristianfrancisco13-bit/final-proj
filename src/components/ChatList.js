import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FaComments, FaUser, FaClock } from 'react-icons/fa';

export default function ChatList({ isOpen, onClose, currentUser, onSelectChat, userType }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listen to user's chats
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const chatData = doc.data();
          const otherParticipantId = chatData.participants.find(id => id !== currentUser.uid);
          
          // Get user details from users collection
          let otherUser = null;
          if (otherParticipantId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                otherUser = {
                  uid: otherParticipantId,
                  name: userData.name || chatData.participantNames[otherParticipantId] || 'User',
                  email: userData.email || chatData.participantEmails[otherParticipantId] || 'user@example.com'
                };
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
              otherUser = {
                uid: otherParticipantId,
                name: chatData.participantNames[otherParticipantId] || 'User',
                email: chatData.participantEmails[otherParticipantId] || 'user@example.com'
              };
            }
          }

          return {
            id: doc.id,
            ...chatData,
            otherUser,
            lastMessageTime: chatData.lastMessageTime?.toDate?.() || new Date()
          };
        })
      );
      
      // Sort chats by last message time (most recent first)
      const sortedChats = chatsData.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      
      setChats(sortedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return messageTime.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaComments className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Messages</h3>
              <p className="text-sm text-gray-500">
                {userType === 'guest' ? 'Chat with hosts' : 'Chat with guests'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FaUser className="text-gray-600" />
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading conversations...</div>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FaComments className="mx-auto text-4xl text-gray-300 mb-4" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a conversation by messaging a {userType === 'guest' ? 'host' : 'guest'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.otherUser, chat.propertyInfo)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <FaUser className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {chat.otherUser?.name || 'User'}
                          </h4>
                          {chat.propertyInfo && (
                            <p className="text-xs text-blue-600 truncate">
                              📍 {chat.propertyInfo.name}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1 ml-2">
                          <FaClock className="text-xs" />
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {chat.lastMessageSender === currentUser.uid ? 'You: ' : ''}
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
