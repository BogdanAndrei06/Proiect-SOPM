import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { ImageBackground, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { auth } from "./src/firebase";
import useTaskStore from "./src/store/taskStore";

import LoginScreen from "./src/screens/LoginScreen";

import AddTaskForm from "./src/components/AddTaskForm";
import Dashboard from "./src/components/Dashboard";
import DaySelector from "./src/components/DaySelector";
import ProgressBar from "./src/components/ProgressBar";
import RecycleBin from "./src/components/RecycleBin";
import Settings from "./src/components/Settings";
import TaskList from "./src/components/TaskList";

import { BarChart3, ClipboardList, LogOut, Moon, Settings as SettingsIcon, Sun } from "lucide-react-native";

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedDay, setSelectedDay] = useState(dayjs());
  const [sortMode, setSortMode] = useState("time");

  const [darkMode, setDarkMode] = useState(false);

  const [dashOpen, setDashOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recycleOpen, setRecycleOpen] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = useTaskStore.getState().subscribeToTasks(user.uid);
    return () => unsub && unsub();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  const iconColor = darkMode ? "#ffffff" : "#111827";

  if (!user) return <LoginScreen />;

  return (
    <ImageBackground
      source={require("./src/poza/React.jpg")}
      resizeMode="cover"
      style={styles.bg}
      imageStyle={styles.bgImage}
    >
      <SafeAreaView style={[styles.safe, darkMode ? styles.darkBg : styles.lightBg]}>
        <View style={[styles.panel, darkMode && styles.panelDark]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ClipboardList size={28} color={iconColor} />
              <Text style={[styles.title, darkMode && styles.titleDark]}>Task Manager</Text>
            </View>

            <View style={styles.headerBtns}>
              <Pressable style={[styles.iconBtn, (settingsOpen || dashOpen) && styles.iconBtnActive]} onPress={() => setSettingsOpen(true)}>
                <SettingsIcon size={18} color={iconColor} />
              </Pressable>

              <Pressable style={[styles.iconBtn, (settingsOpen || dashOpen) && styles.iconBtnActive]} onPress={() => setDashOpen(true)}>
                <BarChart3 size={18} color={iconColor} />
              </Pressable>

              <Pressable style={styles.iconBtn} onPress={() => setDarkMode((p) => !p)}>
                {darkMode ? <Sun size={18} color={iconColor} /> : <Moon size={18} color={iconColor} />}
              </Pressable>

              <Pressable style={styles.iconBtn} onPress={handleLogout}>
                <LogOut size={18} color={iconColor} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
            <ProgressBar selectedDay={selectedDay} />
            <AddTaskForm selectedDay={selectedDay} />
            <DaySelector
              selectedDay={selectedDay}
              onChange={setSelectedDay}
              sortMode={sortMode}
              onChangeSort={setSortMode}
            />
            <TaskList selectedDay={selectedDay} sortMode={sortMode} />
          </ScrollView>
        </View>

      {/* DASHBOARD MODAL */}
      <Modal visible={dashOpen} animationType="slide" onRequestClose={() => setDashOpen(false)}>
        <ImageBackground
          source={require("./src/poza/React.jpg")}
          resizeMode="cover"
          style={styles.bg}
          imageStyle={styles.bgImage}
        >
        <SafeAreaView style={[styles.modalSafe, darkMode ? styles.modalSafeDark : styles.modalSafeLight]}>
          <View style={[styles.modalHeader, darkMode && styles.modalHeaderDark]}>
            <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>Dashboard</Text>
            <Pressable onPress={() => setDashOpen(false)}><Text style={[styles.modalClose, darkMode && styles.modalCloseDark]}>Închide</Text></Pressable>
          </View>
          <ScrollView><Dashboard darkMode={darkMode} /></ScrollView>
        </SafeAreaView>
        </ImageBackground>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal visible={settingsOpen} animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <ImageBackground
          source={require("./src/poza/React.jpg")}
          resizeMode="cover"
          style={styles.bg}
          imageStyle={styles.bgImage}
        >
        <SafeAreaView style={[styles.modalSafe, darkMode ? styles.modalSafeDark : styles.modalSafeLight]}>
          <View style={[styles.modalHeader, darkMode && styles.modalHeaderDark]}>
            <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>Setări</Text>
            <Pressable onPress={() => setSettingsOpen(false)}><Text style={[styles.modalClose, darkMode && styles.modalCloseDark]}>Închide</Text></Pressable>
          </View>
          <ScrollView>
            <Settings darkMode={darkMode} onOpenRecycleBin={() => setRecycleOpen(true)} />
          </ScrollView>
        </SafeAreaView>
        </ImageBackground>
      </Modal>

      {/* RECYCLE BIN MODAL */}
      <Modal visible={recycleOpen} animationType="fade" transparent onRequestClose={() => setRecycleOpen(false)}>
        <View style={styles.recycleBackdrop}>
          <View style={styles.recycleCard}>
            <RecycleBin onBack={() => setRecycleOpen(false)} />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgImage: { opacity: 0.95 },
  safe: { flex: 1, padding: 12 },
  lightBg: { backgroundColor: "transparent" },
  darkBg: { backgroundColor: "rgba(2,6,23,0.25)" },

  panel: { flex: 1, borderRadius: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.35)" },
  panelDark: { backgroundColor: "rgba(15,23,42,0.75)" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(30,64,175,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.45)",
    shadowColor: "#1e3a8a",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  titleDark: { color: "#ffffff" },

  headerBtns: { flexDirection: "row", gap: 10 },
  iconBtn: { height: 40, width: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(59,130,246,0.14)", borderWidth: 1, borderColor: "rgba(59,130,246,0.35)" },
  iconBtnActive: { backgroundColor: "rgba(59,130,246,0.28)", borderColor: "rgba(59,130,246,0.55)" },

  modalSafe: { flex: 1 },
  modalSafeLight: { backgroundColor: "rgba(255,255,255,0.15)" },
  modalSafeDark: { backgroundColor: "rgba(2,6,23,0.65)" },
  modalHeader: { padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(148,163,184,0.25)" },
  modalHeaderDark: { borderBottomColor: "rgba(148,163,184,0.18)" },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalTitleDark: { color: "#f8fafc" },
  modalClose: { fontWeight: "900", color: "#2563eb" },
  modalCloseDark: { color: "#93c5fd" },

  recycleBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 14 },
  recycleCard: { backgroundColor: "white", borderRadius: 18, overflow: "hidden" },
});

