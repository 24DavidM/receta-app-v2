export interface Mensaje {
    id: string;
    contenido: string;
    usuario_id: string;
    created_at: string;
    usuario?: {
        email: string;
        rol: string;
    };
}
