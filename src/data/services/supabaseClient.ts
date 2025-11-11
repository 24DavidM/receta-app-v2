import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Obtenemos las credenciales desde las variables de entorno
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validamos que las variables de entorno estén configuradas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Faltan las variables de entorno EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Asegúrate de tener un archivo .env con estas variables configuradas."
  );
}

// Creamos el cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
