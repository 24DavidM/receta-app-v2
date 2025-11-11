import { Mensaje } from "@/src/domain/models/Mensaje";
import { ChatUseCase } from "@/src/domain/useCases/chat/ChatUseCase";
import { useCallback, useEffect, useRef, useState } from "react";

const chatUseCase = new ChatUseCase();

export const useChat = () => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ usuario_id: string; email?: string }[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cargar mensajes históricos
  const cargarMensajes = useCallback(async () => {
    setCargando(true);
    const mensajesObtenidos = await chatUseCase.obtenerMensajes();
    setMensajes(mensajesObtenidos);
    setCargando(false);
  }, []);

  // Enviar mensaje
  const enviarMensaje = useCallback(async (contenido: string) => {
    if (!contenido.trim()) return { success: false, error: "El mensaje está vacío" };

    setEnviando(true);
    const resultado = await chatUseCase.enviarMensaje(contenido);
    setEnviando(false);

    // Al enviar, marcar como no escribiendo
    try {
      await chatUseCase.setTyping(false);
    } catch (err) {
      // ignorar errores no críticos
    }

    return resultado;
  }, []);

  // Notificar que el usuario está escribiendo (debounced stop)
  const notifyTyping = useCallback(() => {
    // marcar escribiendo inmediatamente
    chatUseCase.setTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // después de inactividad, marcar como no escribiendo
    typingTimeoutRef.current = setTimeout(() => {
      chatUseCase.setTyping(false);
      typingTimeoutRef.current = null;
    }, 1500);
  }, []);

  // Eliminar mensaje
  const eliminarMensaje = useCallback(async (mensajeId: string) => {
    const resultado = await chatUseCase.eliminarMensaje(mensajeId);
    if (resultado.success) {
      setMensajes(prev => prev.filter(m => m.id !== mensajeId));
    }
    return resultado;
  }, []);

  // Suscribirse a mensajes en tiempo real
  useEffect(() => {
    // Cargar mensajes iniciales
    cargarMensajes();

    // Suscribirse a nuevos mensajes
    const desuscribir = chatUseCase.suscribirseAMensajes((nuevoMensaje) => {
      setMensajes(prev => {
        // Evitar duplicados
        if (prev.some(m => m.id === nuevoMensaje.id)) {
          return prev;
        }
        return [...prev, nuevoMensaje];
      });
    });

    // Suscribirse a typing (broadcast events)
    const desuscribirTyping = chatUseCase.suscribirseATyping((evento) => {
      const { usuario_id, email, escribiendo } = evento as any;

      if (escribiendo) {
        // limpiar timer anterior si existe
        if (typingTimers.current[usuario_id]) {
          clearTimeout(typingTimers.current[usuario_id]);
        }

        // añadir usuario si no existe
        setTypingUsers(prev => {
          if (prev.some(u => u.usuario_id === usuario_id)) return prev;
          return [...prev, { usuario_id, email }];
        });

        // quitar tras 3000ms de inactividad
        typingTimers.current[usuario_id] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.usuario_id !== usuario_id));
          delete typingTimers.current[usuario_id];
        }, 3000);
      } else {
        // usuario dejó de escribir -> eliminar y limpiar timer
        if (typingTimers.current[usuario_id]) {
          clearTimeout(typingTimers.current[usuario_id]);
          delete typingTimers.current[usuario_id];
        }
        setTypingUsers(prev => prev.filter(u => u.usuario_id !== usuario_id));
      }
    });

    // Limpiar suscripción al desmontar
    return () => {
      desuscribir();
      desuscribirTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // limpiar timers individuales
      Object.values(typingTimers.current).forEach(t => clearTimeout(t));
      typingTimers.current = {};
    };
  }, [cargarMensajes]);

  return {
    mensajes,
    cargando,
    enviando,
    enviarMensaje,
    eliminarMensaje,
    recargarMensajes: cargarMensajes,
    typingUsers,
    notifyTyping,
  };
};
