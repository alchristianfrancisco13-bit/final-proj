import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FaPaperPlane, FaUser, FaTimes } from 'react-icons/fa';

export default function Messages({ isOpen, onClose, currentUser, otherUser, userType, propertyInfo }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Create a unique chat ID based on user IDs and property ID
  const getChatId = () => {
    if (!currentUser || !otherUser) return null;
    const ids = [currentUser.uid, otherUser.uid].sort();
    const baseChatId = `${ids[0]}_${ids[1]}`;
    
    // If property info exists, include property ID to create separate conversations per property
    if (propertyInfo && propertyInfo.id) {
      return `${baseChatId}_${propertyInfo.id}`;
    }
    
    return baseChatId;
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !otherUser) return;

    setLoading(true);
    try {
      const chatId = getChatId();
      const messageData = {
        chatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        senderEmail: currentUser.email,
        receiverId: otherUser.uid,
        receiverName: otherUser.displayName || otherUser.email?.split('@')[0] || 'User',
        receiverEmail: otherUser.email,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        read: false,
        messageType: 'text',
        propertyInfo: propertyInfo || null
      };

      // Save message to Firestore
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update chat metadata
      await updateChatMetadata(chatId, currentUser, otherUser, newMessage.trim());
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update chat metadata for better organization
  const updateChatMetadata = async (chatId, sender, receiver, lastMessage) => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      const chatData = {
        chatId,
        participants: [sender.uid, receiver.uid],
        participantNames: {
          [sender.uid]: sender.displayName || sender.email?.split('@')[0] || 'User',
          [receiver.uid]: receiver.displayName || receiver.email?.split('@')[0] || 'User'
        },
        participantEmails: {
          [sender.uid]: sender.email,
          [receiver.uid]: receiver.email
        },
        lastMessage: lastMessage,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: sender.uid,
        propertyInfo: propertyInfo || null,
        updatedAt: serverTimestamp()
      };

      if (chatDoc.exists()) {
        // Update existing chat
        await updateDoc(chatRef, {
          lastMessage: lastMessage,
          lastMessageTime: serverTimestamp(),
          lastMessageSender: sender.uid,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new chat
        await setDoc(chatRef, {
          ...chatData,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating chat metadata:', error);
    }
  };

  // Listen to messages
  useEffect(() => {
    if (!isOpen || !currentUser || !otherUser) return;

    const chatId = getChatId();
    if (!chatId) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser, otherUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaUser className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Chat with {otherUser?.displayName || otherUser?.email?.split('@')[0] || 'User'}
              </h3>
              <p className="text-sm text-gray-500">
                {userType === 'guest' ? 'Host' : 'Guest'}
                {propertyInfo && (
                  <span className="ml-2 text-blue-600">
                    • {propertyInfo.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FaTimes className="text-gray-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === currentUser.uid
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === currentUser.uid ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp?.toLocaleTimeString() || 'Now'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-4 border-t bg-gray-50 rounded-b-xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <FaPaperPlane />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
