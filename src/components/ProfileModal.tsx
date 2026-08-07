import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { X, User, Check, LogOut } from "./Icons";
import { UserSession } from "../types";
import { supabase } from "../lib/supabase";

interface ProfileModalProps {
  user: UserSession;
  onClose: () => void;
  onUpdate: (user: UserSession) => void;
  isDarkMode?: boolean;
  language?: "id" | "en";
  onLogout?: () => void;
}

const AVATARS = ["🤖", "🦊", "🌟", "🧙‍♂️", "🛸", "🧠", "🚀", "⚡", "🔮", "🦁"];

export default function ProfileModal({
  user,
  onClose,
  onUpdate,
  isDarkMode = true,
  language = "en",
  onLogout,
}: ProfileModalProps) {
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIndonesian = language === "id";

  const labels = {
    title: isIndonesian ? "Ubah Profil Tamu" : "Edit Guest Profile",
    avatar: isIndonesian ? "Pilih Avatar" : "Select Avatar",
    name: isIndonesian ? "Nama Tamu" : "Guest Name",
    placeholder: isIndonesian ? "Masukkan nama Anda..." : "Your custom name...",
    cancel: isIndonesian ? "Batal" : "Cancel",
    save: isIndonesian ? "Simpan Profil" : "Save Profile",
    logout: isIndonesian ? "Keluar" : "Log Out",
  };

  const handleSubmit = async () => {
    if (!username.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          avatar,
        }
      });

      if (error) throw error;
      if (data.user) {
        const userMeta = data.user.user_metadata || {};
        onUpdate({
          ...user,
          username: userMeta.username || user.username,
          avatar: userMeta.avatar || user.avatar,
        });
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Server connection issue. Unable to save edits.");
    } finally {
      setIsSaving(false);
    }
  };

  const isDark = isDarkMode;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 2 }]}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.backdrop}
        onPress={onClose}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.modalCard, isDark ? styles.cardDark : styles.cardLight]}>
          {/* Header */}
          <View style={[styles.header, isDark ? styles.borderDark : styles.borderLight]}>
            <View style={styles.headerLeft}>
              <User color="#0078D4" size={20} />
              <Text style={[styles.headerTitle, isDark ? styles.textWhite : styles.textDark]}>
                {labels.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={isDark ? "#A0A0A0" : "#616161"} size={18} />
            </TouchableOpacity>
          </View>

          {/* Form Body */}
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Avatar selector */}
            <View style={styles.field}>
              <Text style={styles.label}>{labels.avatar}</Text>
              <View style={[styles.avatarGrid, isDark ? styles.avatarGridDark : styles.avatarGridLight]}>
                {AVATARS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setAvatar(emoji)}
                    style={[
                      styles.avatarItem,
                      avatar === emoji && styles.avatarSelected,
                    ]}
                  >
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Nickname input */}
            <View style={styles.field}>
              <Text style={styles.label}>{labels.name}</Text>
              <TextInput
                style={[
                  styles.input,
                  isDark ? styles.inputDark : styles.inputLight,
                  isDark ? styles.textWhite : styles.textDark,
                ]}
                value={username}
                onChangeText={setUsername}
                maxLength={25}
                placeholder={labels.placeholder}
                placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Footer CTA */}
            <View style={styles.footer}>
              {onLogout ? (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onLogout();
                  }}
                  style={styles.logoutBtn}
                >
                  <LogOut color="#FFFFFF" size={14} />
                  <Text style={styles.logoutBtnText}>{labels.logout}</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}

              <View style={styles.footerRight}>
                <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, isDark ? styles.btnDark : styles.btnLight]}>
                  <Text style={[styles.cancelBtnText, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                    {labels.cancel}
                  </Text>
                </TouchableOpacity>

                <Pressable
                  onPress={handleSubmit}
                  disabled={isSaving || !username.trim()}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && styles.pressed,
                    (isSaving || !username.trim()) && styles.disabled,
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.saveBtnContent}>
                      <Check color="#FFFFFF" size={16} />
                      <Text style={styles.saveBtnText}>{labels.save}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardDark: {
    backgroundColor: "#282828",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  borderDark: {
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  borderLight: {
    borderColor: "#F3F3F3",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
  },
  body: {
    padding: 20,
    gap: 16,
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
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: "600",
  },
  inputDark: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(225, 29, 72, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.2)",
  },
  errorText: {
    fontSize: 11,
    color: "#E11D48",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E11D48",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnDark: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  btnLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0078D4",
  },
  saveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
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
});
