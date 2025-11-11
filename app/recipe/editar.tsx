import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../src/presentation/hooks/useAuth";
import { useRecipes } from "../../src/presentation/hooks/useRecipes";
import { globalStyles } from "../../src/styles/globalStyles";
import { colors, fontSize, spacing } from "../../src/styles/theme";

export default function EditarRecetaScreen() {
  const { id } = useLocalSearchParams();
  const { usuario } = useAuth();
  const { recetas, actualizar, seleccionarImagen, tomarFoto } = useRecipes();
  const router = useRouter();

  const receta = recetas.find((r) => r.id === id);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ingrediente, setIngrediente] = useState("");
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [imagenUri, setImagenUri] = useState<string | null>(null);

  // Cargar datos de la receta al iniciar
  useEffect(() => {
    if (receta) {
      setTitulo(receta.titulo);
      setDescripcion(receta.descripcion);
      setIngredientes(receta.ingredientes);
      // No sobrescribimos si ya se seleccionó una nueva imagen
      if (!imagenUri && receta.imagen_url) {
        setImagenUri(receta.imagen_url);
      }
    }
  }, [receta]);

  // Validar que el usuario es el dueño
  if (!receta) {
    return (
      <View style={globalStyles.containerCentered}>
        <Text style={globalStyles.textSecondary}>Receta no encontrada</Text>
      </View>
    );
  }

  if (receta.chef_id !== usuario?.id) {
    return (
      <View style={globalStyles.containerCentered}>
        <Text style={styles.textoError}>
          No tienes permiso para editar esta receta
        </Text>
        <TouchableOpacity
          style={[globalStyles.button, globalStyles.buttonPrimary]}
          onPress={() => router.back()}
        >
          <Text style={globalStyles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const agregarIngrediente = () => {
    if (ingrediente.trim()) {
      setIngredientes([...ingredientes, ingrediente.trim()]);
      setIngrediente("");
    }
  };

  const quitarIngrediente = (index: number) => {
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (!titulo || !descripcion || ingredientes.length === 0) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }

    setCargando(true);
    const resultado = await actualizar(
      receta.id,
      titulo,
      descripcion,
      ingredientes,
      imagenUri || undefined
    );
    setCargando(false);

    if (resultado.success) {
      Alert.alert("Éxito", "Receta actualizada correctamente", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Error", resultado.error || "No se pudo actualizar");
    }
  };

  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.contentPadding}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.botonVolver}>← Cancelar</Text>
          </TouchableOpacity>
          <Text style={globalStyles.title}>Editar Receta</Text>
        </View>

        <TextInput
          style={globalStyles.input}
          placeholder="Título de la receta"
          value={titulo}
          onChangeText={setTitulo}
        />

        <TextInput
          style={[globalStyles.input, globalStyles.inputMultiline]}
          placeholder="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
        />

        <Text style={globalStyles.subtitle}>Ingredientes:</Text>
        <View style={styles.contenedorIngrediente}>
          <TextInput
            style={[globalStyles.input, styles.inputIngrediente]}
            placeholder="Ej: Tomate"
            value={ingrediente}
            onChangeText={setIngrediente}
            onSubmitEditing={agregarIngrediente}
          />
          <TouchableOpacity
            style={[
              globalStyles.button,
              globalStyles.buttonPrimary,
              styles.botonAgregar,
            ]}
            onPress={agregarIngrediente}
          >
            <Text style={styles.textoAgregar}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listaIngredientes}>
          {ingredientes.map((ing, index) => (
            <View key={index} style={globalStyles.chip}>
              <Text style={globalStyles.chipText}>{ing}</Text>
              <TouchableOpacity onPress={() => quitarIngrediente(index)}>
                <Text style={styles.textoEliminar}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {imagenUri ? (
          <Image source={{ uri: imagenUri }} style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 12 }} />
        ) : receta.imagen_url ? (
          <Image source={{ uri: receta.imagen_url }} style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 12 }} />
        ) : null}

        <TouchableOpacity
          style={[globalStyles.button, globalStyles.buttonSecondary]}
          onPress={async () => {
            const uri = await seleccionarImagen();
            if (uri) setImagenUri(uri);
          }}
        >
          <Text style={globalStyles.buttonText}>{imagenUri ? '� Cambiar Foto' : '📷 Seleccionar Foto'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.button, globalStyles.buttonSecondary, { marginTop: 8 }]}
          onPress={async () => {
            const uri = await tomarFoto();
            if (uri) setImagenUri(uri);
          }}
        >
          <Text style={globalStyles.buttonText}>{imagenUri ? '📸 Cambiar desde Cámara' : '📸 Tomar Foto'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            globalStyles.button,
            globalStyles.buttonPrimary,
            styles.botonGuardar,
          ]}
          onPress={handleGuardar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={globalStyles.buttonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  botonVolver: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  textoError: {
    fontSize: fontSize.lg,
    color: colors.danger,
    textAlign: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  contenedorIngrediente: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputIngrediente: {
    flex: 1,
    marginBottom: 0,
  },
  botonAgregar: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  textoAgregar: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: "bold",
  },
  listaIngredientes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  textoEliminar: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: "bold",
  },
  notaImagen: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    fontStyle: "italic",
  },
  botonGuardar: {
    padding: spacing.lg,
  },
});
