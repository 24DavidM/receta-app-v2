import { supabase } from "@/src/data/services/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Mensaje } from "../../models/Mensaje";

export class ChatUseCase {
  private channel: RealtimeChannel | null = null;
  private typingChannel: RealtimeChannel | null = null;

  // Obtener mensajes históricos
  async obtenerMensajes(limite: number = 50): Promise<Mensaje[]> {
    try {
      // Usar campos denormalizados directamente
      const { data, error } = await supabase
        .from("mensajes")
        .select(`*`)
        .order("created_at", { ascending: false })
        .limit(limite);

      if (error) {
        console.error("Error al obtener mensajes:", error);
        throw error;
      }

      // Mapear usando los campos denormalizados
      const mensajesFormateados = (data || []).map((msg: any) => ({
        id: msg.id,
        contenido: msg.contenido,
        usuario_id: msg.usuario_id,
        created_at: msg.created_at,
        usuario: {
          email: msg.usuario_email || "Desconocido",
          rol: msg.usuario_rol || "usuario",
        },
      }));

      // Invertir el orden para mostrar del más antiguo al más reciente
      return mensajesFormateados.reverse() as Mensaje[];
    } catch (error) {
      console.error("Error al obtener mensajes:", error);
      return [];
    }
  }

  // Enviar un nuevo mensaje
  async enviarMensaje(contenido: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Usuario no autenticado" };
      }

      // El trigger en Supabase se encargará de rellenar usuario_email y usuario_rol
      const { error } = await supabase
        .from('mensajes')
        .insert({ 
          contenido, 
          usuario_id: user.id 
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error("Error al enviar mensaje:", error);
      return { success: false, error: error.message };
    }
  }

  // Suscribirse a nuevos mensajes en tiempo real
  suscribirseAMensajes(callback: (mensaje: Mensaje) => void) {
    this.channel = supabase.channel('mensajes-channel');

    this.channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes'
        },
        (payload) => {
          console.log('📨 Nuevo mensaje recibido!', payload.new);

          // Usar directamente los campos denormalizados del payload
          const mensaje: Mensaje = {
            id: payload.new.id,
            contenido: payload.new.contenido,
            usuario_id: payload.new.usuario_id,
            created_at: payload.new.created_at,
            usuario: {
              email: payload.new.usuario_email || "Desconocido",
              rol: payload.new.usuario_rol || "usuario",
            },
          };

          callback(mensaje);
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción:', status);
      });

    return () => {
      if (this.channel) {
        supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  // Establecer estado de escritura para el usuario actual
  async setTyping(escribiendo: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!this.typingChannel) {
        this.typingChannel = supabase.channel('typing-broadcast');
        this.typingChannel.subscribe();
      }

      await this.typingChannel?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { 
          usuario_id: user.id, 
          email: user.email || "Desconocido", 
          escribiendo 
        },
      });
    } catch (err) {
      console.error('Error setTyping:', err);
    }
  }
  // Suscribirse a eventos de typing vía broadcast realtime
  suscribirseATyping(callback: (evento: { usuario_id: string; email?: string; escribiendo: boolean }) => void) {
    this.typingChannel = supabase.channel('typing-broadcast');

    this.typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        try {
          callback(payload.payload as any);
        } catch (err) {
          console.error('Error manejando broadcast typing:', err);
        }
      })
      .subscribe((status) => {
        console.log('typing-broadcast status:', status);
      });

    return () => {
      if (this.typingChannel) {
        supabase.removeChannel(this.typingChannel);
        this.typingChannel = null;
      }
    };
  }

  // Eliminar un mensaje (opcional)
  async eliminarMensaje(mensajeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("mensajes")
        .delete()
        .eq('id', mensajeId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error("Error al eliminar mensaje:", error);
      return { success: false, error: error.message };
    }
  }
}
