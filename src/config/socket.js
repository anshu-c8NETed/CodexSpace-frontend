import { io } from 'socket.io-client';

let socketInstance = null;
let currentProjectId = null;

export const initializeSocket = (projectId) => {
    // If socket already exists for this project, return it
    if (socketInstance && currentProjectId === projectId && socketInstance.connected) {
        console.log('♻️ Reusing existing socket connection');
        return socketInstance;
    }

    // Disconnect old socket if project changed
    if (socketInstance && currentProjectId !== projectId) {
        console.log('🔄 Project changed, disconnecting old socket');
        socketInstance.disconnect();
        socketInstance = null;
    }

    currentProjectId = projectId;

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
        console.log('✅ Socket connected to project:', projectId);
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
        currentProjectId = null;
    }
}

export const getSocket = () => {
    return socketInstance;
}
