import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Cpu,
  Globe,
  SlidersHorizontal,
  CheckCircle,
  FileText,
  Search,
  Zap,
  X,
  AlertTriangle,
  LogOut,
  User,
} from "./Icons";
import { KnowledgeDocument, UserSession } from "../types";

interface SettingsManagerProps {
  user: UserSession;
  documents: KnowledgeDocument[];
  onAddDocument: (doc: { title: string; content: string; category: string }) => Promise<void>;
  onUpdateDocument: (
    id: string,
    doc: { title: string; content: string; category: string }
  ) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  deepResearch: boolean;
  onToggleDeepResearch: (value: boolean) => void;
  aiEngine: "gemini" | "groq";
  onChangeAiEngine: (engine: "gemini" | "groq") => void;
  language: "id" | "en";
  onToggleLanguage: () => void;
  isDarkMode?: boolean;
  onLogout?: () => void;
}

const CATEGORIES = ["General", "Guide", "Engine", "Security", "Work", "Personal"];

const TRANSLATIONS = {
  en: {
    title: "System Settings & Knowledge Base",
    subtitle: "Manage RAG groundings, engine parameters, and app preferences.",
    accountTitle: "Account & Active Session",
    accountSubtitle: "Manage your current DeksuAI profile session and device auth.",
    guestBadge: "Anonymous Session",
    logoutBtn: "Sign Out / Log Out",
    logoutNotice: "Signing out clears your local session tokens on this device.",
    deepResearch: "Deep Research Mode",
    deepResearchDesc:
      "When enabled, DeksuAI performs multi-perspective breakdowns with rich markdown details.",
    kbTitle: "Custom Knowledge Library",
    kbSubtitle: "Manage context documents used by DeksuAI's RAG keyword search.",
    addDocBtn: "Add New Document",
    searchPlaceholder: "Search documents...",
    defaultDocs: "System Default Document",
    editDoc: "Edit Document",
    createDoc: "Create New Document",
    docTitleLabel: "Document Title",
    docCategoryLabel: "Category",
    docContentLabel: "Content / Knowledge Detail",
    saveDocBtn: "Save Document",
    cancelBtn: "Cancel",
  },
  id: {
    title: "Pengaturan Sistem & Basis Pengetahuan",
    subtitle: "Kelola landasan RAG, parameter model, dan preferensi aplikasi.",
    accountTitle: "Akun & Sesi Aktif",
    accountSubtitle: "Kelola profil sesi DeksuAI dan otentikasi perangkat Anda.",
    guestBadge: "Sesi Anonim",
    logoutBtn: "Keluar dari DeksuAI",
    logoutNotice: "Keluar akan menghapus token sesi lokal di perangkat ini.",
    deepResearch: "Mode Riset Mendalam",
    deepResearchDesc:
      "Saat aktif, DeksuAI memberikan penjelasan terstruktur dengan bagian markdown komprehensif.",
    kbTitle: "Pustaka Pengetahuan Khusus",
    kbSubtitle: "Kelola dokumen konteks yang digunakan oleh pencarian kata kunci RAG DeksuAI.",
    addDocBtn: "Tambah Dokumen Baru",
    searchPlaceholder: "Cari dokumen...",
    defaultDocs: "Dokumen Bawaan Sistem",
    editDoc: "Ubah Dokumen",
    createDoc: "Buat Dokumen Baru",
    docTitleLabel: "Judul Dokumen",
    docCategoryLabel: "Kategori",
    docContentLabel: "Detail Konten / Pengetahuan",
    saveDocBtn: "Simpan Dokumen",
    cancelBtn: "Batal",
  },
};

export default function SettingsManager({
  user,
  documents,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  deepResearch,
  onToggleDeepResearch,
  aiEngine,
  onChangeAiEngine,
  language,
  onToggleLanguage,
  isDarkMode = true,
  onLogout,
}: SettingsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docCategory, setDocCategory] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = TRANSLATIONS[language];
  const isDark = isDarkMode;

  const handleOpenCreateModal = () => {
    setEditingDocId(null);
    setDocTitle("");
    setDocContent("");
    setDocCategory("General");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: KnowledgeDocument) => {
    setEditingDocId(doc.id);
    setDocTitle(doc.title);
    setDocContent(doc.content);
    setDocCategory(doc.category || "General");
    setIsModalOpen(true);
  };

  const handleSaveDocument = async () => {
    if (!docTitle.trim() || !docContent.trim()) return;
    setIsSubmitting(true);

    try {
      if (editingDocId) {
        await onUpdateDocument(editingDocId, {
          title: docTitle.trim(),
          content: docContent.trim(),
          category: docCategory,
        });
      } else {
        await onAddDocument({
          title: docTitle.trim(),
          content: docContent.trim(),
          category: docCategory,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView
      style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.innerStack}>
        {/* Header Title */}
        <View style={styles.headerBox}>
          <Text style={[styles.title, isDark ? styles.textWhite : styles.textDark]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, isDark ? styles.textMutedDark : styles.textMutedLight]}>
            {t.subtitle}
          </Text>
        </View>

        {/* Account & Session Card */}
        {user && (
          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <View style={styles.cardHeader}>
              <User color="#0078D4" size={18} />
              <Text style={[styles.cardTitle, isDark ? styles.textWhite : styles.textDark]}>
                {t.accountTitle}
              </Text>
            </View>
            <Text style={[styles.cardDesc, isDark ? styles.textMutedDark : styles.textMutedLight]}>
              {t.accountSubtitle}
            </Text>

            <View style={[styles.accountBox, isDark ? styles.accountBoxDark : styles.accountBoxLight]}>
              <Text style={styles.userAvatarEmoji}>{user.avatar}</Text>
              <View style={styles.accountTextStack}>
                <View style={styles.accountNameRow}>
                  <Text style={[styles.accountName, isDark ? styles.textWhite : styles.textDark]}>
                    {user.username}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t.guestBadge}</Text>
                  </View>
                </View>
                <Text style={styles.accountSubtext} numberOfLines={1}>
                  ID: {user.id} {user.email ? `• ${user.email}` : ""}
                </Text>
              </View>
              {onLogout && (
                <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                  <LogOut color="#FFFFFF" size={15} />
                  <Text style={styles.logoutBtnText}>{t.logoutBtn}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.logoutNoticeText}>{t.logoutNotice}</Text>
          </View>
        )}

        {/* Deep Research Mode Card */}
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View style={styles.cardHeader}>
                <SlidersHorizontal color="#0078D4" size={18} />
                <Text style={[styles.switchTitle, isDark ? styles.textWhite : styles.textDark]}>
                  {t.deepResearch}
                </Text>
              </View>
              <Text style={[styles.switchDesc, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                {t.deepResearchDesc}
              </Text>
            </View>
            <Switch
              value={deepResearch}
              onValueChange={onToggleDeepResearch}
              trackColor={{ false: "#616161", true: "#0078D4" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Knowledge Base Management Section */}
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
          <View style={styles.kbHeaderRow}>
            <View style={styles.kbHeaderLeft}>
              <BookOpen color="#0078D4" size={20} style={{ marginTop: 2 }} />
              <View style={styles.kbHeaderTextStack}>
                <Text style={[styles.cardTitle, isDark ? styles.textWhite : styles.textDark]}>
                  {t.kbTitle}
                </Text>
                <Text style={[styles.cardDesc, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                  {t.kbSubtitle}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleOpenCreateModal} style={styles.addDocBtn}>
              <Plus color="#FFFFFF" size={14} />
              <Text style={styles.addDocBtnText}>{t.addDocBtn}</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, isDark ? styles.inputDark : styles.inputLight]}>
            <Search color="#A0A0A0" size={16} />
            <TextInput
              style={[styles.searchInput, isDark ? styles.textWhite : styles.textDark]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
            />
          </View>

          {/* Documents list */}
          <View style={styles.docList}>
            {filteredDocs.map((doc) => {
              const isSystem = doc.userId === "system";
              return (
                <View
                  key={doc.id}
                  style={[
                    styles.docCard,
                    isDark ? styles.docCardDark : styles.docCardLight,
                  ]}
                >
                  <View style={styles.docCardHeader}>
                    <View style={styles.docTitleStack}>
                      <Text style={[styles.docTitle, isDark ? styles.textWhite : styles.textDark]}>
                        {doc.title}
                      </Text>
                      <View style={styles.docCategoryBadge}>
                        <Text style={styles.docCategoryText}>{doc.category || "General"}</Text>
                      </View>
                    </View>

                    {!isSystem && (
                      <View style={styles.docActions}>
                        <TouchableOpacity
                          onPress={() => handleOpenEditModal(doc)}
                          style={styles.docActionBtn}
                        >
                          <Edit2 color="#A0A0A0" size={14} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onDeleteDocument(doc.id)}
                          style={styles.docActionBtn}
                        >
                          <Trash2 color="#E11D48" size={14} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[styles.docContentSnippet, isDark ? styles.textMutedDark : styles.textMutedLight]}
                    numberOfLines={3}
                  >
                    {doc.content}
                  </Text>

                  {isSystem && (
                    <Text style={styles.systemTag}>📌 {t.defaultDocs}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Edit / Create Document Modal */}
      {isModalOpen && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 2 }]}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => setIsModalOpen(false)}
          />
          <View style={styles.modalOverlay} pointerEvents="box-none">
            <View style={[styles.modalCard, isDark ? styles.cardDark : styles.cardLight]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDark ? styles.textWhite : styles.textDark]}>
                  {editingDocId ? t.editDoc : t.createDoc}
                </Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <X color={isDark ? "#A0A0A0" : "#616161"} size={18} />
                </TouchableOpacity>
              </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>{t.docTitleLabel}</Text>
                <TextInput
                  style={[
                    styles.input,
                    isDark ? styles.inputDark : styles.inputLight,
                    isDark ? styles.textWhite : styles.textDark,
                  ]}
                  value={docTitle}
                  onChangeText={setDocTitle}
                  placeholder="E.g. Project Roadmap 2026..."
                  placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t.docCategoryLabel}</Text>
                <View style={styles.categoryRow}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setDocCategory(cat)}
                      style={[
                        styles.catBadge,
                        docCategory === cat && styles.catBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catBadgeText,
                          docCategory === cat && styles.catBadgeTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t.docContentLabel}</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    isDark ? styles.inputDark : styles.inputLight,
                    isDark ? styles.textWhite : styles.textDark,
                  ]}
                  value={docContent}
                  onChangeText={setDocContent}
                  placeholder="Paste details, guidelines, notes, FAQs..."
                  placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                  multiline
                  numberOfLines={6}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>{t.cancelBtn}</Text>
                </TouchableOpacity>

                <Pressable
                  onPress={handleSaveDocument}
                  disabled={isSubmitting || !docTitle.trim() || !docContent.trim()}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && styles.pressed,
                    (isSubmitting || !docTitle.trim() || !docContent.trim()) &&
                      styles.disabled,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{t.saveDocBtn}</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  innerStack: {
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
    gap: 20,
  },
  bgDark: {
    backgroundColor: "#202020",
  },
  bgLight: {
    backgroundColor: "#f3f3f3",
  },
  headerBox: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
  },
  card: {
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  cardDark: {
    backgroundColor: "#282828",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  engineGrid: {
    flexDirection: "row",
    gap: 10,
  },
  engineOption: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  engineOptionActive: {
    borderColor: "#0078D4",
    backgroundColor: "rgba(0, 120, 212, 0.1)",
  },
  optionDark: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  optionLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  engineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  engineTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  engineSubText: {
    fontSize: 10,
    color: "#616161",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
  },
  borderDark: {
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  borderLight: {
    borderColor: "#E5E5E5",
  },
  switchInfo: {
    flex: 1,
    paddingRight: 16,
    gap: 2,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  switchDesc: {
    fontSize: 11,
  },
  kbHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  kbHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  kbHeaderTextStack: {
    flex: 1,
  },
  addDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0078D4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  addDocBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  inputDark: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  docList: {
    gap: 12,
  },
  docCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  docCardDark: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  docCardLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  docCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docTitleStack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  docCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  docCategoryText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0078D4",
  },
  docActions: {
    flexDirection: "row",
    gap: 6,
  },
  docActionBtn: {
    padding: 4,
    borderRadius: 4,
  },
  docContentSnippet: {
    fontSize: 11,
    lineHeight: 16,
  },
  systemTag: {
    fontSize: 10,
    color: "#616161",
    fontWeight: "600",
  },
  modalBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalBody: {
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
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  catBadgeActive: {
    backgroundColor: "#0078D4",
    borderColor: "#0078D4",
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A0A0A0",
  },
  catBadgeTextActive: {
    color: "#FFFFFF",
  },
  textArea: {
    minHeight: 100,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 12,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A0A0",
  },
  saveBtn: {
    backgroundColor: "#0078D4",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
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
  accountBox: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  accountBoxDark: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  accountBoxLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  userAvatarEmoji: {
    fontSize: 24,
  },
  accountTextStack: {
    flex: 1,
    minWidth: 200,
    gap: 2,
  },
  accountNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#0078D4",
    fontSize: 10,
    fontWeight: "700",
  },
  accountSubtext: {
    fontSize: 11,
    color: "#616161",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E11D48",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  logoutNoticeText: {
    fontSize: 11,
    color: "#616161",
    fontStyle: "italic",
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
