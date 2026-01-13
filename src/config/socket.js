import { io } from 'socket.io-client';

let socketInstance = null;

export const initializeSocket = (projectId) => {
    socketInstance = io(import.meta.env.VITE_API_URL, {
        auth: {
            token: localStorage.getItem('token')
        },
        query: {
            projectId
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000
    });

    socketInstance.on('connect', () => {
        console.log('✅ Socket connected');
    });

    socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected:', reason);
    });

    return socketInstance;
}

export const receiveMessage = (eventName, cb) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    socketInstance.on(eventName, cb);
}

export const sendMessage = (eventName, data) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    socketInstance.emit(eventName, data);
}

export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}
