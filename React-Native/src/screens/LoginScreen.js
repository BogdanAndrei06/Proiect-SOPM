import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { auth } from "../firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      Alert.alert("Eroare", err.message);
    }
  };

  const register = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      Alert.alert("Eroare", err.message);
    }
  };

  return (
    <ImageBackground
      source={require("../poza/bg1.jpg")}
      resizeMode="cover"
      style={styles.bg}
      imageStyle={styles.bgImage}
    >
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Autentificare</Text>

          <TextInput
            style={styles.input}
            placeholder="Email..."
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Parola..."
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.btn} onPress={login}>
            <Text style={styles.btnText}>Login</Text>
          </Pressable>

          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={register}>
            <Text style={styles.btnText}>Creează cont</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgImage: { opacity: 0.95 },
  page: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "rgba(148,163,184,0.45)", borderRadius: 12, padding: 12, marginBottom: 10 },
  btn: { backgroundColor: "#2d89ef", borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  btnSecondary: { backgroundColor: "#111827" },
  btnText: { color: "white", fontWeight: "900", textAlign: "center" },
});
