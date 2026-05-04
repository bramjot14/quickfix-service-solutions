import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem('qf_token');
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const useSocket = () => {
  const socket = useRef(null);

  useEffect(() => {
    socket.current = getSocket();
    return () => {};
  }, []);

  const joinJob = useCallback((jobId) => {
    socket.current?.emit('join_job', { jobId });
  }, []);

  const leaveJob = useCallback((jobId) => {
    socket.current?.emit('leave_job', { jobId });
  }, []);

  const sendBid = useCallback((data) => {
    socket.current?.emit('send_bid', data);
  }, []);

  const sendMessage = useCallback((jobId, text) => {
    socket.current?.emit('send_message', { jobId, text });
  }, []);

  const sendTyping = useCallback((jobId) => {
    socket.current?.emit('typing', { jobId });
  }, []);

  const on = useCallback((event, handler) => {
    socket.current?.on(event, handler);
    return () => socket.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socket.current?.off(event, handler);
  }, []);

  return { socket: socket.current, joinJob, leaveJob, sendBid, sendMessage, sendTyping, on, off };
};
