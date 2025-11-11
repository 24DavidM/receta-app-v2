import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../data/services/supabaseClient";
import { Receta } from "../../models/Receta";

export class RecipesUseCase {
  // Obtener todas las recetas
  async obtenerRecetas(): Promise<Receta[]> {
    try {
      const { data, error } = await supabase
        .from("recetas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.log("Error al obtener recetas:", error);
      return [];
    }
  }

  // Buscar recetas por ingrediente
  async buscarPorIngrediente(ingrediente: string): Promise<Receta[]> {
    try {
      const { data, error } = await supabase
        .from("recetas")
        .select("*")
        .contains("ingredientes", [ingrediente])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.log("Error en búsqueda:", error);
      return [];
    }
  }

  // Crear nueva receta
  async crearReceta(
    titulo: string,
    descripcion: string,
    ingredientes: string[],
    chefId: string,
    imagenUri?: string
  ) {
    try {
      let imagenUrl = null;

      // Si hay imagen, la subimos primero
      if (imagenUri) {
        imagenUrl = await this.subirImagen(imagenUri);
      }

      const { data, error } = await supabase
        .from("recetas")
        .insert({
          titulo,
          descripcion,
          ingredientes,
          chef_id: chefId,
          imagen_url: imagenUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, receta: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Actualizar receta existente (ahora acepta imagen opcional)
  async actualizarReceta(
    id: string,
    titulo: string,
    descripcion: string,
    ingredientes: string[],
    imagenUri?: string
  ) {
    try {
      let imagenUrl: string | null | undefined = undefined;

      // Si se proporciona una nueva imagen, la subimos y actualizamos la URL
      if (imagenUri) {
        imagenUrl = await this.subirImagen(imagenUri);
      }

      const updateData: any = {
        titulo,
        descripcion,
        ingredientes,
      };

      if (imagenUrl) {
        updateData.imagen_url = imagenUrl;
      }

      const { data, error } = await supabase
        .from("recetas")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, receta: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Eliminar receta
  async eliminarReceta(id: string) {
    try {
      const { error } = await supabase.from("recetas").delete().eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Subir imagen a Supabase Storage
  private async subirImagen(uri: string): Promise<string | null> {
    try {
      let fileData: Uint8Array;
      let mimeType: string | undefined;

      if (uri.startsWith("data:")) {
        const match = uri.match(/^data:(.+);base64,(.*)$/);
        if (!match) {
          console.log("data URI no válida:", uri.substring(0, 100));
          return null;
        }
        mimeType = match[1];
        const b64 = match[2];
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        fileData = bytes;
      } else {
        // Normal URL or file URI: fetch and get arrayBuffer (preferred)
        const response = await fetch(uri);
        mimeType = response.headers.get("content-type") || undefined;
        let arrayBuffer: ArrayBuffer;
        if (response.arrayBuffer) {
          try {
            arrayBuffer = await (response.arrayBuffer as any)();
          } catch (err) {
            console.log("response.arrayBuffer() falló, intentando blob():", err);
            // fallback to blob
            // @ts-ignore
            const blob = await response.blob();
            arrayBuffer = await (blob.arrayBuffer ? blob.arrayBuffer() : Promise.reject(new Error("blob.arrayBuffer no disponible")));
          }
        } else {
          // @ts-ignore
          const blob = await response.blob();
          arrayBuffer = await (blob.arrayBuffer ? blob.arrayBuffer() : Promise.reject(new Error("blob.arrayBuffer no disponible")));
        }
        fileData = new Uint8Array(arrayBuffer);
      }

      // Derivar extensión y contentType si hace falta
      let extension = undefined as string | undefined;
      if (mimeType) {
        const parts = mimeType.split("/");
        extension = parts[1];
      } else {
        const maybeExt = uri.split(".").pop()?.split(/[#?]/)[0];
        if (maybeExt && maybeExt.length <= 5) extension = maybeExt;
      }
      if (!extension) extension = "jpg";
      if (!mimeType) mimeType = `image/${extension}`;

      const nombreArchivo = `recetas/${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`;


      // Subir a Supabase Storage 
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("recetas-fotos")
        .upload(nombreArchivo, fileData, {
          contentType: mimeType,
        });

      if (uploadData) console.log("subirImagen: uploadData=", uploadData);

      if (uploadError) {
        if ((uploadError as any)?.status === 409) {
          const fallbackName = `recetas/${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;
          const { data: d2, error: e2 } = await supabase.storage
            .from("recetas-fotos")
            .upload(fallbackName, fileData, { contentType: mimeType });
          if (e2) {
            return null;
          }
          const { data: urlData2 } = supabase.storage.from("recetas-fotos").getPublicUrl(fallbackName);
          return urlData2?.publicUrl ?? null;
        }
        return null;
      }

      const { data: urlData } = supabase.storage.from("recetas-fotos").getPublicUrl(nombreArchivo);
      return urlData?.publicUrl ?? null;
    } catch (error) {
      console.log("Error al subir imagen:", error);
      return null;
    }
  }

  // Seleccionar imagen de la galería
  async seleccionarImagen(): Promise<string | null> {
    try {
      // Pedir permisos
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        alert("Necesitamos permisos para acceder a tus fotos");
        return null;
      }

      // Abrir selector de imágenes
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!resultado.canceled) {
        return resultado.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.log("Error al seleccionar imagen:", error);
      return null;
    }
  }

  // Tomar una foto con la cámara
  async tomarFoto(): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        alert("Necesitamos permisos para usar la cámara");
        return null;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!resultado.canceled) {
        return resultado.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.log("Error al tomar foto:", error);
      return null;
    }
  }
}
