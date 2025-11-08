import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FaComments, FaUser, FaClock, FaTimes } from 'react-icons/fa';

export default function ChatList({ isOpen, onClose, currentUser, onSelectChat, userType }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listen to user's chats
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const chatsRef = collection(db, 'chats');
    
    // Use simple query without orderBy to avoid Firestore conflicts
    // We'll sort in memory instead
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const chatsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const chatData = docSnap.data();
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
                    name: userData.name || chatData.participantNames?.[otherParticipantId] || 'User',
                    email: userData.email || chatData.participantEmails?.[otherParticipantId] || 'user@example.com'
                  };
                }
              } catch (error) {
                console.error('Error fetching user data:', error);
                otherUser = {
                  uid: otherParticipantId,
                  name: chatData.participantNames?.[otherParticipantId] || 'User',
                  email: chatData.participantEmails?.[otherParticipantId] || 'user@example.com'
                };
              }
            }

            return {
              id: docSnap.id,
              ...chatData,
              otherUser,
              lastMessageTime: chatData.lastMessageTime?.toDate?.() || new Date()
            };
          })
        );
        
        // Always sort in memory to ensure consistent ordering
        const sortedChats = chatsData.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        
        setChats(sortedChats);
        setLoading(false);
      } catch (error) {
        console.error('Error processing chats:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to chats:', error);
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
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <FaComments className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Messages</h3>
              <p className="text-sm text-gray-600">
                {userType === 'guest' ? 'Chat with hosts' : 'Chat with guests'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white hover:shadow transition"
          >
            <FaTimes className="text-gray-600" />
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
            <div className="divide-y divide-gray-100">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.otherUser, chat.propertyInfo)}
                  className="p-4 hover:bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaUser className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {chat.otherUser?.name || 'User'}
                          </h4>
                          {chat.propertyInfo && (
                            <p className="text-xs text-blue-600 truncate flex items-center gap-1">
                              <span>📍</span>
                              <span className="font-medium">{chat.propertyInfo.name}</span>
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1 ml-2 flex-shrink-0">
                          <FaClock className="text-xs" />
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessageSender === currentUser.uid && (
                          <span className="text-blue-600 font-medium">You: </span>
                        )}
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
