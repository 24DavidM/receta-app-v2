import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import {
  borderRadius,
  colors,
  fontSize,
  spacing,
} from "../../src/styles/theme";

export default function CrearRecetaScreen() {
  const { usuario, esChef } = useAuth();
  const { crear, seleccionarImagen, tomarFoto } = useRecipes();
  const router = useRouter();

  const safeBack = () => {
    try {
      if ((router as any).canGoBack && (router as any).canGoBack()) {
        router.back();
      } else {
        router.push("/(tabs)");
      }
    } catch (e) {
      router.push("/(tabs)");
    }
  };

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ingrediente, setIngrediente] = useState("");
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const agregarIngrediente = () => {
    if (ingrediente.trim()) {
      setIngredientes([...ingredientes, ingrediente.trim()]);
      setIngrediente("");
    }
  };

  const quitarIngrediente = (index: number) => {
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  const handleSeleccionarImagen = async () => {
    const uri = await seleccionarImagen();
    if (uri) {
      setImagenUri(uri);
    }
  };

  const handleTomarFoto = async () => {
    const uri = await tomarFoto();
    if (uri) {
      setImagenUri(uri);
    }
  };

  const handleCrear = async () => {
    if (!titulo || !descripcion || ingredientes.length === 0) {
      Alert.alert(
        "Error",
        "Completa todos los campos y agrega al menos un ingrediente"
      );
      return;
    }

    setCargando(true);
    const resultado = await crear(
      titulo,
      descripcion,
      ingredientes,
      usuario!.id,
      imagenUri || undefined
    );
    setCargando(false);

    if (resultado.success) {
      Alert.alert("Éxito", "Receta creada correctamente", [
        {
          text: "OK",
          onPress: () => {
            setTitulo("");
            setDescripcion("");
            setIngredientes([]);
            setImagenUri(null);
            router.push("/(tabs)");
          },
        },
      ]);
    } else {
      Alert.alert("Error", resultado.error || "No se pudo crear la receta");
    }
  };

  if (!esChef) {
    return (
      <View style={globalStyles.containerCentered}>
        <Text style={styles.textoNoChef}>
          Esta sección es solo para chefs 👨‍🍳
        </Text>
        <Text style={globalStyles.textSecondary}>
          Crea una cuenta de chef para poder publicar recetas
        </Text>
        <TouchableOpacity
          style={[globalStyles.button, globalStyles.buttonPrimary, { marginTop: 16 }]}
          onPress={safeBack}
        >
          <Text style={globalStyles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.contentPadding}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/(tabs)")}>
            <Text style={styles.botonVolver}>← Volver</Text>
          </TouchableOpacity>
          <Text style={globalStyles.title}>Nueva Receta</Text>
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

        <TouchableOpacity
          style={[globalStyles.button, globalStyles.buttonSecondary]}
          onPress={handleSeleccionarImagen}
        >
          <Text style={globalStyles.buttonText}>
            {imagenUri ? "📷 Cambiar Foto" : "📷 Agregar Foto"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.button, globalStyles.buttonSecondary, { marginTop: 8 }]}
          onPress={handleTomarFoto}
        >
          <Text style={globalStyles.buttonText}>{imagenUri ? "📸 Cambiar desde Cámara" : "📸 Tomar Foto"}</Text>
        </TouchableOpacity>

        {imagenUri && (
          <Image source={{ uri: imagenUri }} style={styles.vistaPrevia} />
        )}

        <TouchableOpacity
          style={[
            globalStyles.button,
            globalStyles.buttonPrimary,
            styles.botonCrear,
          ]}
          onPress={handleCrear}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={globalStyles.buttonText}>Publicar Receta</Text>
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
  textoNoChef: {
    fontSize: fontSize.xl,
    fontWeight: "bold",
    textAlign: "center",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
  vistaPrevia: {
    width: "100%",
    height: 200,
    borderRadius: borderRadius.md,
    marginVertical: spacing.md,
  },
  botonCrear: {
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
});
