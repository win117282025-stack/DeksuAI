import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
  PanResponder,
} from "react-native";
import {
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Mail,
  Lock,
  LogIn,
} from "./Icons";
import { apiUrl } from "../utils/api";
import { UserSession } from "../types";
import { supabase, isPlaceholderSupabase } from "../lib/supabase";

interface AnonymousLoginProps {
  onLoginSuccess: (session: UserSession) => void;
  language: "id" | "en";
  onToggleLanguage: () => void;
  isDarkMode?: boolean;
}

const AVATARS = ["🤖", "🦊", "🌟", "🧙‍♂️", "🛸", "🧠", "🚀", "⚡", "🔮", "🦁"];
const NAMES = [
  "Silent Nomad",
  "Digital Scribe",
  "Knowledge Seeker",
  "Info Curator",
  "Data Weaver",
  "Logic Craft",
  "Mind Explorer",
  "Byte Wizard",
  "Zen Architect",
  "Nexus Pilot",
];

type AuthTab = "login" | "register" | "guest";

export default function AnonymousLogin({
  onLoginSuccess,
  language,
  onToggleLanguage,
  isDarkMode = true,
}: AnonymousLoginProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");

  // Registration States
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  // Login States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Guest States
  const [guestUsername, setGuestUsername] = useState("");
  const [guestAvatar, setGuestAvatar] = useState(AVATARS[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRandomGuestName = () => {
    const base = NAMES[Math.floor(Math.random() * NAMES.length)];
    const num = Math.floor(Math.random() * 9000 + 1000);
    setGuestUsername(`${base} #${num}`);
    setGuestAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  };

  const generateRandomRegName = () => {
    const base = NAMES[Math.floor(Math.random() * NAMES.length)];
    const num = Math.floor(Math.random() * 9000 + 1000);
    setRegUsername(`${base} #${num}`);
    setSelectedAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  };

  useEffect(() => {
    generateRandomGuestName();
    generateRandomRegName();
  }, []);

  const handleAuthSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isPlaceholderSupabase) {
        // Mock success for placeholder mode
        const mockUser = {
          id: `mock-${Date.now()}`,
          email: activeTab === "login" ? loginEmail : (activeTab === "register" ? regEmail : `guest-${Date.now()}@example.com`),
          username: activeTab === "guest" ? guestUsername : (activeTab === "register" ? regUsername : "User"),
          avatar: activeTab === "guest" ? guestAvatar : (activeTab === "register" ? selectedAvatar : "🤖"),
          createdAt: new Date().toISOString(),
        };
        onLoginSuccess(mockUser);
        setIsLoading(false);
        return;
      }

      let userData;
      
      if (activeTab === "login") {
        if (!loginEmail.trim() || !loginPassword) {
          setError("Please enter your credentials.");
          setIsLoading(false);
          return;
        }
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });
        if (authError) throw authError;
        userData = data.user;
        
      } else if (activeTab === "register") {
        if (!regEmail.trim() || !regPassword || !regUsername.trim()) {
          setError("Please fill out all registration fields.");
          setIsLoading(false);
          return;
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email: regEmail,
          password: regPassword,
          options: {
            data: {
              username: regUsername,
              avatar: selectedAvatar,
            }
          }
        });
        if (authError) throw authError;
        userData = data.user;
        
      } else {
        if (!guestUsername.trim()) {
          setError("Please enter a guest name.");
          setIsLoading(false);
          return;
        }
        const { data, error: authError } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              username: guestUsername,
              avatar: guestAvatar,
            }
          }
        });
        if (authError) throw authError;
        userData = data.user;
      }

      if (userData) {
        // Fallbacks if data properties are empty
        const userMeta = userData.user_metadata || {};
        onLoginSuccess({
          id: userData.id,
          email: userData.email || "",
          username: userMeta.username || "User",
          avatar: userMeta.avatar || "🤖",
          createdAt: userData.created_at || new Date().toISOString(),
        });
      } else {
        setError("Authentication failed. Please verify credentials.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to connect to Supabase. Please check connection and env variables.");
    } finally {
      setIsLoading(false);
    }
  };

  const stateRef = useRef({ activeTab });
  useEffect(() => {
    stateRef.current = { activeTab };
  }, [activeTab]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 40 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const state = stateRef.current;
        const tabs: AuthTab[] = ["login", "register", "guest"];
        const currentIndex = tabs.indexOf(state.activeTab);
        
        if (gestureState.dx > 50 && currentIndex > 0) {
          // Swipe Right (Go to previous tab)
          setActiveTab(tabs[currentIndex - 1]);
        } else if (gestureState.dx < -50 && currentIndex < tabs.length - 1) {
          // Swipe Left (Go to next tab)
          setActiveTab(tabs[currentIndex + 1]);
        }
      },
    })
  ).current;

  const isDark = isDarkMode;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isDark ? styles.bgDark : styles.bgLight,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            isDark ? styles.cardDark : styles.cardLight,
          ]}
        >
        {/* Branding Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={{ uri: "https://raw.githubusercontent.com/win117282025-stack/just-deksuai-icon/refs/heads/main/WhatsApp%20Image%202026-08-04%20at%2019.58.46.jpeg" }}
              style={styles.logoBadgeImage}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.title, isDark ? styles.textWhite : styles.textDark]}>
            Deksu<Text style={styles.titleAccent}>AI</Text>
          </Text>
          <Text style={[styles.subtitle, isDark ? styles.textMutedDark : styles.textMutedLight]}>
            Knowledge-Grounded Mobile Companion
          </Text>
        </View>

        {/* Auth Mode Tabs */}
        <View style={[styles.tabBar, isDark ? styles.tabBarDark : styles.tabBarLight]}>
          {(["login", "register", "guest"] as AuthTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setError(null);
                }}
                style={[
                  styles.tabButton,
                  isActive && (isDark ? styles.tabActiveDark : styles.tabActiveLight),
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive
                      ? styles.tabButtonTextActive
                      : isDark
                      ? styles.textMutedDark
                      : styles.textMutedLight,
                  ]}
                >
                  {tab === "login" ? "Sign In" : tab === "register" ? "Register" : "Guest"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form Body */}
        <View style={styles.formGroup}>
          {activeTab === "login" && (
            <View style={styles.fieldStack}>
              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isDark ? styles.inputDark : styles.inputLight,
                  ]}
                >
                  <Mail color={isDark ? "#A0A0A0" : "#616161"} size={16} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isDark ? styles.textWhite : styles.textDark]}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    placeholder="Enter email..."
                    placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isDark ? styles.inputDark : styles.inputLight,
                  ]}
                >
                  <Lock color={isDark ? "#A0A0A0" : "#616161"} size={16} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isDark ? styles.textWhite : styles.textDark]}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="Enter password..."
                    placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          )}

          {activeTab === "register" && (
            <View style={styles.fieldStack}>
              <View style={styles.field}>
                <Text style={styles.label}>Select Avatar</Text>
                <View style={[styles.avatarGrid, isDark ? styles.avatarGridDark : styles.avatarGridLight]}>
                  {AVATARS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setSelectedAvatar(emoji)}
                      style={[
                        styles.avatarItem,
                        selectedAvatar === emoji && styles.avatarSelected,
                      ]}
                    >
                      <Text style={styles.avatarEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Nickname</Text>
                  <TouchableOpacity onPress={generateRandomRegName} style={styles.randomBtn}>
                    <RefreshCw color="#0078D4" size={12} />
                    <Text style={styles.randomBtnText}>Randomize</Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    isDark ? styles.inputDark : styles.inputLight,
                  ]}
                >
                  <Text style={styles.avatarInlineEmoji}>{selectedAvatar}</Text>
                  <TextInput
                    style={[styles.input, isDark ? styles.textWhite : styles.textDark]}
                    value={regUsername}
                    onChangeText={setRegUsername}
                    placeholder="Enter custom nickname..."
                    placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isDark ? styles.inputDark : styles.inputLight,
                  ]}
                >
                  <Mail color={isDark ? "#A0A0A0" : "#616161"} size={16} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isDark ? styles.textWhite : styles.textDark]}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    placeholder="Enter email..."
                    placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Create Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isDark ? styles.inputDark : styles.inputLight,
                  ]}
                >
                  <Lock color={isDark ? "#A0A0A0" : "#616161"} size={16} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isDark ? styles.textWhite : styles.textDark]}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    placeholder="Min 6 characters..."
                    placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          )}

          {activeTab === "guest" && (
            <View style={styles.fieldStack}>
              <View style={styles.field}>
                <Text style={styles.label}>Select Guest Avatar</Text>
                <View style={[styles.avatarGrid, isDark ? styles.avatarGridDark : styles.avatarGridLight]}>
                  {AVATARS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setGuestAvatar(emoji)}
                      style={[
                        styles.avatarItem,
                        guestAvatar === emoji && styles.avatarSelected,
                      ]}
                    >
                      <Text style={styles.avatarEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Nickname</Text>
                  <TouchableOpacity onPress={generateRandomGuestName} style={styles.randomBtn}>
                    <RefreshCw color="#0078D4" size={12} />
                    <Text style={styles.randomBtnText}>Randomize</Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    isDark ? styles.inputDark : styles.inputLight,
                  ]}
                >
                  <Text style={styles.avatarInlineEmoji}>{guestAvatar}</Text>
                  <TextInput
                    style={[styles.input, isDark ? styles.textWhite : styles.textDark]}
                    value={guestUsername}
                    onChangeText={setGuestUsername}
                    placeholder="Enter custom nickname..."
                    placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                  />
                </View>
              </View>

              <View style={styles.guestNotice}>
                <UserCheck color="#0078D4" size={16} style={{ marginTop: 2 }} />
                <Text style={styles.guestNoticeText}>
                  A private, local-only session. Chats and custom documents are retained under an anonymous identifier in your cache.
                </Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <ShieldAlert color="#E11D48" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* CTA Submit Button */}
          <Pressable
            onPress={handleAuthSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.submitContent}>
                <LogIn color="#FFFFFF" size={16} />
                <Text style={styles.submitText}>
                  {activeTab === "login"
                    ? "Sign Into Deksu"
                    : activeTab === "register"
                    ? "Create Account"
                    : "Launch Guest Access"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  bgDark: {
    backgroundColor: "#202020",
  },
  bgLight: {
    backgroundColor: "#F3F3F3",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: "#282828",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0078D4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#0078D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logoBadgeImage: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: "#0078D4",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  textWhite: {
    color: "#f3f3f3",
  },
  textDark: {
    color: "#282828",
  },
  textMutedDark: {
    color: "#A0A0A0",
  },
  textMutedLight: {
    color: "#616161",
  },
  tabBar: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabBarDark: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  tabBarLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActiveDark: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  tabActiveLight: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: "#0078D4",
  },
  formGroup: {
    gap: 16,
  },
  fieldStack: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#A0A0A0",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  randomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  randomBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0078D4",
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  inputDark: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  inputIcon: {
    marginRight: 10,
  },
  avatarInlineEmoji: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    height: "100%",
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
  },
  avatarGridDark: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  avatarGridLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  avatarItem: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 20,
  },
  avatarSelected: {
    backgroundColor: "rgba(0, 120, 212, 0.2)",
    borderWidth: 2,
    borderColor: "#0078D4",
  },
  guestNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0, 120, 212, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 120, 212, 0.2)",
  },
  guestNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#616161",
    lineHeight: 16,
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(225, 29, 72, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.2)",
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    color: "#E11D48",
    fontWeight: "700",
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: "#0078D4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#0078D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
