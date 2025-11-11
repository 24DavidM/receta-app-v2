import { Mensaje } from "@/src/domain/models/Mensaje";
import { useAuth } from "@/src/presentation/hooks/useAuth";
import { useChat } from "@/src/presentation/hooks/useChat";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function ChatScreen() {
    const { mensajes, cargando, enviando, enviarMensaje, typingUsers, notifyTyping } = useChat();
    const { usuario } = useAuth();
    const [textoMensaje, setTextoMensaje] = useState("");
    const flatListRef = useRef<FlatList>(null);

    // Auto-scroll al final cuando llegan nuevos mensajes
    useEffect(() => {
        if (mensajes.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [mensajes]);

    const handleEnviar = async () => {
        if (!textoMensaje.trim() || enviando) return;

        const mensaje = textoMensaje;
        setTextoMensaje(""); // Limpiar input inmediatamente

        const resultado = await enviarMensaje(mensaje);

        if (!resultado.success) {
            alert("Error: " + resultado.error);
            setTextoMensaje(mensaje); // Restaurar mensaje si falló
        }
    };

    const renderMensaje = ({ item }: { item: Mensaje }) => {
        const esMio = item.usuario_id === usuario?.id;
        const emailUsuario = item.usuario?.email || "Usuario desconocido";
        const rolUsuario = item.usuario?.rol || "Sin rol";
        return (
            <View
                style={[
                    styles.mensajeContainer,
                    esMio ? styles.mensajeMio : styles.mensajeOtro,
                ]}
            >
                <Text style={[styles.nombreUsuario, esMio && styles.nombreUsuarioMio]}>
                    {esMio
                        ? `${usuario?.nombre || usuario?.email || "Tú"} (${usuario?.rol || "Sin rol"})`
                        : `${emailUsuario} (${rolUsuario || "Sin rol"})`}
                </Text>

                <Text
                    style={[
                        styles.contenidoMensaje,
                        esMio && styles.contenidoMensajeMio,
                    ]}
                >
                    {item.contenido}
                </Text>

                <Text style={[styles.horaMensaje, esMio && styles.horaMensajeMio]}>
                    {new Date(item.created_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </Text>
            </View>
        );
    };

    // Mostrar indicador si hay usuarios escribiendo distintos al actual
    const otrosEscribiendo = (typingUsers || []).filter(t => t.usuario_id !== usuario?.id);
    const typingText = otrosEscribiendo.length === 0
        ? ""
        : otrosEscribiendo.length === 1
            ? `${otrosEscribiendo[0].email || "Alguien"} está escribiendo...`
            : `${otrosEscribiendo.length} personas están escribiendo...`;

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.textoCargando}>Cargando mensajes...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={100}
        >
            <FlatList
                ref={flatListRef}
                data={mensajes}
                renderItem={renderMensaje}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            {/* Indicador de escritura */}
            {typingText ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                    <Text style={{ color: "#666", fontStyle: "italic" }}>{typingText}</Text>
                </View>
            ) : null}

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={textoMensaje}
                    onChangeText={(t) => { setTextoMensaje(t); notifyTyping(); }}
                    placeholder="Escribe un mensaje..."
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[
                        styles.botonEnviar,
                        (!textoMensaje.trim() || enviando) && styles.botonDeshabilitado,
                    ]}
                    onPress={handleEnviar}
                    disabled={!textoMensaje.trim() || enviando}
                >
                    <Text style={styles.textoBotonEnviar}>
                        {enviando ? "..." : "Enviar"}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    centrado: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    textoCargando: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    listContainer: {
        padding: 16,
    },
    mensajeContainer: {
        maxWidth: "75%",
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    mensajeMio: {
        alignSelf: "flex-end",
        backgroundColor: "#007AFF",
    },
    mensajeOtro: {
        alignSelf: "flex-start",
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    nombreUsuario: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
        marginBottom: 4,
    },
    nombreUsuarioMio: {
        color: "rgba(255, 255, 255, 0.95)",
        alignSelf: "flex-end",
    },
    contenidoMensaje: {
        fontSize: 16,
        color: "#000",
    },
    contenidoMensajeMio: {
        color: "#FFF",
    },
    horaMensaje: {
        fontSize: 10,
        color: "#999",
        marginTop: 4,
        alignSelf: "flex-end",
    },
    horaMensajeMio: {
        color: "rgba(255, 255, 255, 0.7)",
    },
    inputContainer: {
        flexDirection: "row",
        padding: 12,
        backgroundColor: "#FFF",
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#F5F5F5",
        borderRadius: 20,
        fontSize: 16,
    },
    botonEnviar: {
        marginLeft: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#007AFF",
        borderRadius: 20,
        justifyContent: "center",
    },
    botonDeshabilitado: {
        backgroundColor: "#CCC",
    },
    textoBotonEnviar: {
        color: "#FFF",
        fontWeight: "600",
        fontSize: 16,
    },
});


