import { useEffect, useRef, useState } from "react";
import { getSocket, sendPresence } from "../services/socket";

export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const listener = (...args) => handlerRef.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event]);
}

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function usePresence(projectId) {
  const [presence, setPresence] = useState({});

  useEffect(() => {
    if (!projectId) return;

    sendPresence(projectId, "active");

    let idleTimer;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      sendPresence(projectId, "active");
      idleTimer = setTimeout(() => sendPresence(projectId, "idle"), 3 * 60 * 1000);
    };
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    resetIdle();

    const socket = getSocket();
    if (socket) {
      socket.on("user:presence", ({ userId, name, avatar, status }) => {
        setPresence(p => ({ ...p, [userId]: { name, avatar, status } }));
      });
      socket.on("user:online", ({ userId, name }) => {
        setPresence(p => ({ ...p, [userId]: { ...p[userId], name, status: "active" } }));
      });
      socket.on("user:offline", ({ userId }) => {
        setPresence(p => {
          const next = { ...p };
          delete next[userId];
          return next;
        });
      });
    }

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      socket?.off("user:presence");
      socket?.off("user:online");
      socket?.off("user:offline");
      sendPresence(projectId, "away");
    };
  }, [projectId]);

  return presence;
}

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const v = value instanceof Function ? value(storedValue) : value;
      setStoredValue(v);
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };

  return [storedValue, setValue];
}

export function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}
