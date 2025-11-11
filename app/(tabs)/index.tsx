import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
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

export default function HomeScreen() {
  const { usuario, cerrarSesion } = useAuth();
  const { recetas, cargando, cargarRecetas, buscar, eliminar } = useRecipes();
  const [busqueda, setBusqueda] = useState("");
  const [refrescando, setRefrescando] = useState(false);
  const router = useRouter();

  // Filtrado local para que el buscador funcione aunque la búsqueda remota falle
  const busquedaLower = busqueda.trim().toLowerCase();
  const recetasMostradas = busquedaLower
    ? recetas.filter((item) => {
        const titulo = (item.titulo || "").toLowerCase();
        const descripcion = (item.descripcion || "").toLowerCase();
        const ingredientes = (
          Array.isArray(item.ingredientes)
            ? item.ingredientes.join(" ")
            : String(item.ingredientes || "")
        ).toLowerCase();
        return (
          titulo.includes(busquedaLower) ||
          descripcion.includes(busquedaLower) ||
          ingredientes.includes(busquedaLower)
        );
      })
    : recetas;

  const handleBuscar = () => {
    if (busqueda.trim()) {
      buscar(busqueda.trim().toLowerCase());
    } else {
      cargarRecetas();
    }
  };

  const handleRefresh = async () => {
    setRefrescando(true);
    await cargarRecetas();
    setRefrescando(false);
  };

  const handleCerrarSesion = async () => {
    await cerrarSesion();
    router.replace("/auth/login");
  };

  const handleEliminar = (recetaId: string) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que quieres eliminar esta receta? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const resultado = await eliminar(recetaId);
            if (resultado.success) {
              Alert.alert("Éxito", "Receta eliminada correctamente");
            } else {
              Alert.alert("Error", resultado.error || "No se pudo eliminar");
            }
          },
        },
      ]
    );
  };

  if (!usuario) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <View>
          <Text style={styles.saludo}>¡Hola!</Text>
          <Text style={globalStyles.textSecondary}>{usuario.email}</Text>
          <Text style={styles.rol}>
            {usuario.rol === "chef" ? "👨‍🍳 Chef" : "👤 Usuario"}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            globalStyles.button,
            globalStyles.buttonDanger,
            styles.botonCerrar,
          ]}
          onPress={handleCerrarSesion}
        >
          <Text style={globalStyles.buttonText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contenedorBusqueda}>
        <TextInput
          style={[globalStyles.input, styles.inputBusqueda]}
          placeholder="Buscar por ingrediente..."
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={handleBuscar}
        />
        <TouchableOpacity
          style={[
            globalStyles.button,
            globalStyles.buttonPrimary,
            styles.botonBuscar,
          ]}
          onPress={handleBuscar}
        >
          <Text style={styles.iconoBuscar}>🔍</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.lg }}
        />
      ) : (
          <FlatList
          data={recetasMostradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            <Text style={globalStyles.emptyState}>
              No hay recetas disponibles
            </Text>
          }
          renderItem={({ item }) => (
            <View style={globalStyles.card}>
              {item.imagen_url ? (
                <Image
                  source={{ uri: item.imagen_url }}
                  style={globalStyles.cardImage}
                />
              ) : (
                <View style={styles.imagenPlaceholder}>
                  <Text style={globalStyles.textTertiary}>Sin imagen</Text>
                </View>
              )}

              <View style={styles.infoReceta}>
                <Text style={styles.tituloReceta}>{item.titulo}</Text>
                <Text style={globalStyles.textSecondary} numberOfLines={2}>
                  {item.descripcion}
                </Text>
                <Text style={styles.ingredientes}>
                  🥘 {item.ingredientes.slice(0, 3).join(", ")}
                  {item.ingredientes.length > 3 && "..."}
                </Text>
              </View>

              {/* Botones de acción para el chef dueño */}
              {usuario?.id === item.chef_id && (
                <View style={styles.botonesAccion}>
                  <TouchableOpacity
                    style={[
                      globalStyles.button,
                      globalStyles.buttonSecondary,
                      styles.botonAccion,
                    ]}
                    onPress={() => router.push(`/recipe/editar?id=${item.id}`)}
                  >
                    <Text style={globalStyles.buttonText}>✏️ Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      globalStyles.button,
                      globalStyles.buttonDanger,
                      styles.botonAccion,
                    ]}
                    onPress={() => handleEliminar(item.id)}
                  >
                    <Text style={globalStyles.buttonText}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  saludo: {
    fontSize: fontSize.xl,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  rol: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xs / 2,
    fontWeight: "500",
  },
  botonCerrar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  contenedorBusqueda: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
  },
  inputBusqueda: {
    flex: 1,
    marginBottom: 0,
  },
  botonBuscar: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  iconoBuscar: {
    fontSize: fontSize.lg,
  },
  imagenPlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  infoReceta: {
    paddingTop: spacing.md,
  },
  tituloReceta: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  ingredientes: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  botonesAccion: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  botonAccion: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
});
