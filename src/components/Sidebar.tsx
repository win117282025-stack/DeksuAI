import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
} from "react-native";
import {
  MessageSquare,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Settings2,
  X,
} from "./Icons";
import { UserSession, ChatSession } from "../types";

interface SidebarProps {
  user: UserSession;
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (id: string) => void;
  currentTab: "chat" | "settings";
  onChangeTab: (tab: "chat" | "settings") => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onClose?: () => void;
  language: "id" | "en";
  onToggleLanguage: () => void;
  isDarkMode?: boolean;
}

const TRANSLATIONS = {
  en: {
    chatTab: "AI Chat Assistant",
    settingsTab: "System Settings",
    activeChats: "Active Chats",
    noChats: "No active dialogue histories. Get started by launching a session!",
    newChatBtn: "New Chat Session",
    groundingTitle: "Grounding Active",
    groundingDesc:
      "When you query DeksuAI, it automatically scans your custom knowledge base to inject relevant context for factual generation.",
    guestAccount: "Guest Account",
    editProfile: "Edit Profile",
    closeSession: "Close Session",
  },
  id: {
    chatTab: "Asisten Obrolan AI",
    settingsTab: "Pengaturan Sistem",
    activeChats: "Obrolan Aktif",
    noChats: "Tidak ada riwayat obrolan aktif. Mulai dengan membuat sesi!",
    newChatBtn: "Sesi Obrolan Baru",
    groundingTitle: "Pencarian Aktif",
    groundingDesc:
      "Saat Anda bertanya pada DeksuAI, sistem secara otomatis memindai basis pengetahuan khusus untuk menyuntikkan konteks yang relevan.",
    guestAccount: "Akun Tamu",
    editProfile: "Ubah Profil",
    closeSession: "Keluar Sesi",
  },
};

export default function Sidebar({
  user,
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  currentTab,
  onChangeTab,
  onLogout,
  onEditProfile,
  onClose,
  language,
  onToggleLanguage,
  isDarkMode = true,
}: SidebarProps) {
  const t = TRANSLATIONS[language];
  const isDark = isDarkMode;
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  return (
    <View style={[styles.sidebar, isDark ? styles.bgDark : styles.bgLight]}>
      {/* Brand Header */}
      <View style={[styles.header, isDark ? styles.borderDark : styles.borderLight]}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Image
              source={{ uri: "https://raw.githubusercontent.com/win117282025-stack/just-deksuai-icon/refs/heads/main/WhatsApp%20Image%202026-08-04%20at%2019.58.46.jpeg" }}
              style={styles.logoBadgeImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.brandTextStack}>
            <Text style={[styles.brandTitle, isDark ? styles.textWhite : styles.textDark]}>
              Deksu<Text style={styles.brandAccent}>AI</Text>
            </Text>
            <Text style={styles.brandSubtitle}>Personal RAG Engine</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color={isDark ? "#A0A0A0" : "#616161"} size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Tabs Navigation */}
      <View style={styles.navSection}>
        <TouchableOpacity
          onPress={() => onChangeTab("chat")}
          style={[
            styles.navTab,
            currentTab === "chat" &&
              (isDark ? styles.navTabActiveDark : styles.navTabActiveLight),
          ]}
        >
          <MessageSquare
            color={
              currentTab === "chat"
                ? "#0078D4"
                : isDark
                ? "#A0A0A0"
                : "#616161"
            }
            size={16}
          />
          <Text
            style={[
              styles.navTabText,
              currentTab === "chat"
                ? styles.navTabTextActive
                : isDark
                ? styles.textMutedDark
                : styles.textMutedLight,
            ]}
          >
            {t.chatTab}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onChangeTab("settings")}
          style={[
            styles.navTab,
            currentTab === "settings" &&
              (isDark ? styles.navTabActiveDark : styles.navTabActiveLight),
          ]}
        >
          <Settings2
            color={
              currentTab === "settings"
                ? "#0078D4"
                : isDark
                ? "#A0A0A0"
                : "#616161"
            }
            size={16}
          />
          <Text
            style={[
              styles.navTabText,
              currentTab === "settings"
                ? styles.navTabTextActive
                : isDark
                ? styles.textMutedDark
                : styles.textMutedLight,
            ]}
          >
            {t.settingsTab}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentTab === "chat" ? (
          <View style={styles.chatSection}>
            <View style={styles.chatHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                {t.activeChats} ({chats.length})
              </Text>
              <TouchableOpacity onPress={onCreateChat} style={styles.addChatBtn}>
                <Plus color={isDark ? "#A0A0A0" : "#616161"} size={16} />
              </TouchableOpacity>
            </View>

            {chats.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  isDark ? styles.emptyStateDark : styles.emptyStateLight,
                ]}
              >
                <Text
                  style={[
                    styles.emptyStateText,
                    isDark ? styles.textMutedDark : styles.textMutedLight,
                  ]}
                >
                  {t.noChats}
                </Text>
                <TouchableOpacity onPress={onCreateChat} style={styles.newChatBtn}>
                  <Text style={styles.newChatBtnText}>{t.newChatBtn}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.chatList}>
                {chats.map((chat) => {
                  const isActive = activeChatId === chat.id;
                  return (
                    <TouchableOpacity
                      key={chat.id}
                      onPress={() => onSelectChat(chat.id)}
                      style={[
                        styles.chatItem,
                        isActive &&
                          (isDark
                            ? styles.chatItemActiveDark
                            : styles.chatItemActiveLight),
                      ]}
                    >
                      <MessageSquare
                        color={isActive ? "#0078D4" : "#A0A0A0"}
                        size={16}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.chatItemTitle,
                          isActive
                            ? isDark
                              ? styles.textWhite
                              : styles.textDark
                            : isDark
                            ? styles.textMutedDark
                            : styles.textMutedLight,
                        ]}
                        numberOfLines={1}
                      >
                        {chat.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => onDeleteChat(chat.id)}
                        style={styles.deleteChatBtn}
                        accessibilityLabel="Delete chat"
                      >
                        <Trash2 color="#E11D48" size={14} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.groundingBox}>
            <Text style={styles.groundingBoxTitle}>{t.groundingTitle}</Text>
            <Text style={styles.groundingBoxDesc}>{t.groundingDesc}</Text>
          </View>
        )}
      </ScrollView>

      {/* User Profile Footer */}
      <View style={[styles.footer, isDark ? styles.borderDark : styles.borderLight]}>
        <View style={[styles.userCard, isDark ? styles.userCardDark : styles.userCardLight]}>
          <Text style={styles.userAvatar}>{user.avatar}</Text>
          <View style={styles.userInfo}>
            <Text
              style={[styles.username, isDark ? styles.textWhite : styles.textDark]}
              numberOfLines={1}
            >
              {user.username}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email || t.guestAccount}
            </Text>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity onPress={onEditProfile} style={styles.userActionBtn}>
              <Edit3 color={isDark ? "#A0A0A0" : "#616161"} size={16} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={styles.userActionBtn}>
              <LogOut color="#E11D48" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    height: "100%",
  },
  bgDark: {
    backgroundColor: "#282828",
  },
  bgLight: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 16,
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
    borderColor: "#E5E5E5",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0078D4",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeImage: {
    width: "100%",
    height: "100%",
  },
  brandTextStack: {
    gap: 2,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  brandAccent: {
    color: "#0078D4",
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0078D4",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  navSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 6,
  },
  navTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navTabActiveDark: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  navTabActiveLight: {
    backgroundColor: "#EEF2FF",
  },
  navTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  navTabTextActive: {
    color: "#0078D4",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 12,
    flexGrow: 1,
  },
  chatSection: {
    gap: 10,
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#A0A0A0",
  },
  addChatBtn: {
    padding: 4,
    borderRadius: 4,
  },
  emptyState: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    marginVertical: 8,
  },
  emptyStateDark: {
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  emptyStateLight: {
    borderColor: "#CBD5E1",
  },
  emptyStateText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 10,
  },
  newChatBtn: {
    backgroundColor: "#0078D4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newChatBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  chatList: {
    gap: 4,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  chatItemActiveDark: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  chatItemActiveLight: {
    backgroundColor: "#F3F3F3",
  },
  chatItemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  deleteChatBtn: {
    padding: 6,
    borderRadius: 4,
  },
  itemMenuDropdown: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 2,
    marginLeft: 24,
    borderWidth: 1,
  },
  itemMenuDark: {
    backgroundColor: "#2d2d2d",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  itemMenuLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  itemMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  deleteText: {
    color: "#E11D48",
    fontSize: 12,
    fontWeight: "600",
  },
  groundingBox: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
  },
  groundingBoxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0078D4",
    marginBottom: 4,
  },
  groundingBoxDesc: {
    fontSize: 11,
    color: "#616161",
    lineHeight: 16,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  userCardDark: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  userCardLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  userAvatar: {
    fontSize: 22,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 13,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 10,
    color: "#A0A0A0",
  },
  userActions: {
    flexDirection: "row",
    gap: 2,
  },
  userActionBtn: {
    padding: 6,
    borderRadius: 4,
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
