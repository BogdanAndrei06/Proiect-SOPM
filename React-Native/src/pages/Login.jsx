import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { auth } from "../firebase";

import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // TODO: pune aici client IDs (din Google Cloud / Firebase setup)
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // expoClientId: "...",
    // iosClientId: "...",
    // androidClientId: "...",
    // webClientId: "...",
  });

  useEffect(() => {
    (async () => {
      if (response?.type !== "success") return;

      const idToken = response.params?.id_token;
      const accessToken = response.params?.access_token;

      if (!idToken) {
        Alert.alert("Google login", "Lipsește id_token.");
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      await signInWithCredential(auth, credential);
    })().catch((e) => Alert.alert("Google login", e?.message ?? "Eroare"));
  }, [response]);

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      Alert.alert("Login", err.message);
    }
  };

  const register = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      Alert.alert("Register", err.message);
    }
  };

  const loginGoogle = async () => {
    try {
      await promptAsync();
    } catch (err) {
      Alert.alert("Google", err.message);
    }
  };

  return (
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

        <Pressable style={styles.btn} onPress={register}>
          <Text style={styles.btnText}>Creează cont</Text>
        </Pressable>

        <Text style={styles.divider}>sau</Text>

        <Pressable
          style={[styles.btn, styles.googleBtn]}
          onPress={loginGoogle}
          disabled={!request}
        >
          <Text style={[styles.btnText, styles.googleBtnText]}>Continuă cu Google</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
  card: {
    width: "100%",
    maxWidth: 380,
    padding: 22,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 14 },
  input: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  btn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2d89ef",
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { color: "#fff", fontWeight: "800" },
  googleBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  googleBtnText: { color: "#111827" },
  divider: { textAlign: "center", marginVertical: 6, color: "#6b7280" },
});
