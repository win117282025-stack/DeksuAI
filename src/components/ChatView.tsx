import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import {
  Send,
  Sparkles,
  BookMarked,
  Layers,
  HelpCircle,
  Menu,
  Sun,
  Moon,
  Terminal,
  Edit3,
  Trash2,
} from "./Icons";
import { ChatSession, Message } from "../types";
import Typewriter from "./Typewriter";

interface ChatViewProps {
  session: ChatSession | null;
  onSendMessage: (text: string) => void;
  isSending: boolean;
  onSelectSuggestion: (text: string) => void;
  onMenuClick?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  language: "id" | "en";
  onToggleLanguage: () => void;
  onDeleteChat?: (id: string) => void;
  onRenameChat?: (id: string, newTitle: string) => void;
}

const SUGGESTIONS_EN = [
  "Is Deksu Like to play kite? 🪁",
  "Who Created this AI? 🧠",
  "Tell me a funny joke! 😂",
];

const SUGGESTIONS_ID = [
  "Apakah Deksu suka bermain layang-layang? 🪁",
  "Siapa pembuat AI ini? 🧠",
  "Beritahu saya lelucon yang lucu! 😂",
];

const TRANSLATIONS = {
  en: {
    welcome: "Welcome to DeksuAI!",
    online: "DeksuAI Online",
    groundingActive: "Grounding Active",
    readyToChat: "Ready to chat",
    askPlaceholder: "Ask DeksuAI about anything...",
    groundingPowered: "Grounding powered by local KB keyword index",
    suggestedInquiries: "Suggested Inquiries",
    noActiveSession:
      "Create a new chat session using the sidebar to begin. I can ground my responses using articles and custom documents from your personal knowledge base!",
    matchedSources: "Matched Sources",
    scanning: "DeksuAI is scanning context and thinking...",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    langTooltip: "Ubah ke Bahasa Indonesia",
    startDialogue: "Start of a New Dialogue",
    startDialogueDesc:
      "Ask DeksuAI anything. Our local keyword indexing checks your knowledge documents and integrates match summaries dynamically.",
    tryAsking: "Try asking:",
    clickSuggestion: "Click any suggestion to initialize a dialogue instantly.",
    editPrompt: "Edit & Resend Prompt",
  },
  id: {
    welcome: "Selamat datang di DeksuAI!",
    online: "DeksuAI Online",
    groundingActive: "Pencarian Aktif",
    readyToChat: "Siap mengobrol",
    askPlaceholder: "Tanyakan apa saja kepada DeksuAI...",
    groundingPowered:
      "Pencarian didukung oleh indeks kata kunci basis pengetahuan lokal",
    suggestedInquiries: "Saran Pertanyaan",
    noActiveSession:
      "Buat sesi obrolan baru menggunakan bilah samping untuk memulai. Saya dapat melandasi jawaban saya menggunakan artikel dan dokumen khusus dari basis pengetahuan pribadi Anda!",
    matchedSources: "Sumber Pencocokan",
    scanning: "DeksuAI sedang memindai konteks dan berpikir...",
    themeLight: "Mode Terang",
    themeDark: "Mode Gelap",
    langTooltip: "Switch to English",
    startDialogue: "Awal Percakapan Baru",
    startDialogueDesc:
      "Tanyakan apa saja kepada DeksuAI. Pengindeksan kata kunci lokal kami memeriksa dokumen pengetahuan Anda dan mengintegrasikan ringkasan kecocokan secara dinamis.",
    tryAsking: "Coba tanyakan:",
    clickSuggestion: "Klik saran apa saja untuk memulai obrolan secara instan.",
    editPrompt: "Ubah & Kirim Ulang Pesan",
  },
};

export default function ChatView({
  session,
  onSendMessage,
  isSending,
  onSelectSuggestion,
  onMenuClick,
  isDarkMode,
  onToggleTheme,
  language,
  onToggleLanguage,
  onDeleteChat,
  onRenameChat,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const t = TRANSLATIONS[language];
  const suggestions = language === "id" ? SUGGESTIONS_ID : SUGGESTIONS_EN;
  const isDark = isDarkMode;

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [session?.messages, isSending]);

  const handleSubmit = () => {
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const renderInlineMarkdown = (inlineText: string, isAI: boolean) => {
    const tokens = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(inlineText)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: "text",
          content: inlineText.substring(lastIndex, match.index),
        });
      }
      const raw = match[0];
      if (raw.startsWith("`") && raw.endsWith("`")) {
        tokens.push({ type: "code", content: raw.slice(1, -1) });
      } else if (raw.startsWith("**") && raw.endsWith("**")) {
        tokens.push({ type: "bold", content: raw.slice(2, -2) });
      } else if (raw.startsWith("*") && raw.endsWith("*")) {
        tokens.push({ type: "bold", content: raw.slice(1, -1) });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < inlineText.length) {
      tokens.push({
        type: "text",
        content: inlineText.substring(lastIndex),
      });
    }

    return tokens.map((token, idx) => {
      if (token.type === "bold") {
        return (
          <Text key={idx} style={{ fontWeight: "700" }}>
            {token.content}
          </Text>
        );
      }
      if (token.type === "code") {
        return (
          <Text
            key={idx}
            style={[
              styles.inlineCode,
              isDark ? styles.inlineCodeDark : styles.inlineCodeLight,
            ]}
          >
            {token.content}
          </Text>
        );
      }
      return <Text key={idx}>{token.content}</Text>;
    });
  };

  const formatMessageText = (text: string, isAI: boolean) => {
    if (!text) return null;

    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: "markdown",
          content: text.substring(lastIndex, match.index),
        });
      }
      blocks.push({
        type: "codeblock",
        lang: match[1] || "code",
        content: match[2].trim(),
      });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      blocks.push({
        type: "markdown",
        content: text.substring(lastIndex),
      });
    }

    const defaultTextColorStyle = isAI
      ? isDark
        ? styles.textWhite
        : styles.textDark
      : styles.textWhite;

    return (
      <View style={styles.messageTextContainer}>
        {blocks.map((block, blockIdx) => {
          if (block.type === "codeblock") {
            return (
              <View
                key={blockIdx}
                style={[
                  styles.codeBlockContainer,
                  isDark ? styles.codeBlockDark : styles.codeBlockLight,
                ]}
              >
                <View style={styles.codeBlockHeader}>
                  <Terminal color="#818CF8" size={12} />
                  <Text style={styles.codeBlockLang}>{block.lang}</Text>
                </View>
                <Text style={styles.codeBlockText}>{block.content}</Text>
              </View>
            );
          }

          const lines = block.content.split("\n");
          return (
            <View key={blockIdx}>
              {lines.map((line, lineIdx) => {
                const trimmed = line.trim();
                if (!trimmed) {
                  return <View key={lineIdx} style={{ height: 6 }} />;
                }

                if (trimmed.startsWith("#")) {
                  const headerLevel = (trimmed.match(/^#+/) || ["#"])[0].length;
                  const headerText = trimmed.replace(/^#+\s*/, "");
                  const fontSize =
                    headerLevel === 1 ? 18 : headerLevel === 2 ? 16 : 14;
                  return (
                    <Text
                      key={lineIdx}
                      style={[
                        defaultTextColorStyle,
                        {
                          fontWeight: "bold",
                          fontSize,
                          marginTop: 6,
                          marginBottom: 4,
                        },
                      ]}
                    >
                      {renderInlineMarkdown(headerText, isAI)}
                    </Text>
                  );
                }

                const isBullet =
                  trimmed.startsWith("- ") ||
                  trimmed.startsWith("* ") ||
                  /^\d+\.\s/.test(trimmed);

                if (isBullet) {
                  const bulletText = trimmed.replace(/^[-*]\s+|\d+\.\s+/, "");
                  return (
                    <View key={lineIdx} style={styles.bulletRow}>
                      <Text style={[styles.bulletPoint, defaultTextColorStyle]}>
                        •
                      </Text>
                      <Text style={[styles.bulletText, defaultTextColorStyle]}>
                        {renderInlineMarkdown(bulletText, isAI)}
                      </Text>
                    </View>
                  );
                }

                return (
                  <Text
                    key={lineIdx}
                    style={[
                      styles.messageParagraph,
                      defaultTextColorStyle,
                      { marginVertical: 2 },
                    ]}
                  >
                    {renderInlineMarkdown(line, isAI)}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
      {/* Header */}
      <View style={[styles.header, isDark ? styles.borderDark : styles.borderLight]}>
        <View style={styles.headerLeft}>
          {onMenuClick && (
            <TouchableOpacity
              onPress={onMenuClick}
              style={[
                styles.menuBtn,
                isDark ? styles.menuBtnDark : styles.menuBtnLight,
              ]}
              accessibilityLabel="Open sidebar menu"
            >
              <Menu color={isDark ? "#818CF8" : "#4F46E5"} size={20} />
            </TouchableOpacity>
          )}
          <View style={styles.headerLogoContainer}>
            <Image
              source={{ uri: "https://raw.githubusercontent.com/win117282025-stack/just-deksuai-icon/refs/heads/main/WhatsApp%20Image%202026-08-04%20at%2019.58.46.jpeg" }}
              style={styles.headerLogoImage}
              resizeMode="cover"
            />
            <View style={styles.statusDot} />
          </View>
          <View style={styles.headerTitleStack}>
            <Text
              style={[styles.headerTitle, isDark ? styles.textWhite : styles.textDark]}
              numberOfLines={1}
            >
              {session ? session.title : t.readyToChat}
            </Text>
            <View style={styles.headerSubRow}>
              <Text style={styles.onlineStatus}>{t.online}</Text>
              <View style={styles.groundingBadge}>
                <Text style={styles.groundingBadgeText}>{t.groundingActive}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onToggleLanguage} style={styles.langBtn}>
            <Text style={styles.langBtnText}>
              🌐 {language === "id" ? "ID" : "EN"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onToggleTheme} style={styles.themeBtn}>
            {isDark ? (
              <Sun color="#F59E0B" size={18} />
            ) : (
              <Moon color="#0078D4" size={18} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Rename Chat Modal */}
      {isRenaming && (
        <Modal
          transparent
          animationType="fade"
          visible={isRenaming}
          onRequestClose={() => setIsRenaming(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.renameModalContent, isDark ? styles.optionsDark : styles.optionsLight]}>
              <Text style={[styles.renameModalTitle, isDark ? styles.textWhite : styles.textDark]}>
                {language === "id" ? "Ubah Nama Obrolan" : "Rename Chat Session"}
              </Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                style={[styles.renameInput, isDark ? styles.renameInputDark : styles.renameInputLight]}
                placeholder={language === "id" ? "Nama Obrolan Baru" : "New Chat Title"}
                placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
                autoFocus
              />
              <View style={styles.renameModalButtons}>
                <TouchableOpacity
                  onPress={() => setIsRenaming(false)}
                  style={styles.renameCancelBtn}
                >
                  <Text style={styles.renameCancelText}>
                    {language === "id" ? "Batal" : "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (session && newTitle.trim() && onRenameChat) {
                      onRenameChat(session.id, newTitle.trim());
                    }
                    setIsRenaming(false);
                  }}
                  style={styles.renameSaveBtn}
                >
                  <Text style={styles.renameSaveText}>
                    {language === "id" ? "Simpan" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Messages viewport */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!session ? (
          <View style={styles.welcomeCard}>
            <View style={styles.sparkleBadge}>
              <Image
                source={{ uri: "https://raw.githubusercontent.com/win117282025-stack/just-deksuai-icon/refs/heads/main/WhatsApp%20Image%202026-08-04%20at%2019.58.46.jpeg" }}
                style={styles.welcomeBadgeImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.welcomeTitle, isDark ? styles.textWhite : styles.textDark]}>
              {t.welcome}
            </Text>
            <Text style={[styles.welcomeSub, isDark ? styles.textMutedDark : styles.textMutedLight]}>
              {t.noActiveSession}
            </Text>

            <View style={[styles.suggestionBox, isDark ? styles.cardDark : styles.cardLight]}>
              <View style={styles.suggestionBoxHeader}>
                <HelpCircle color="#0078D4" size={16} />
                <Text style={styles.suggestionBoxTitle}>{t.suggestedInquiries}</Text>
              </View>
              <View style={styles.suggestionList}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => onSelectSuggestion(s)}
                    style={[
                      styles.suggestionItem,
                      isDark ? styles.suggestionItemDark : styles.suggestionItemLight,
                    ]}
                  >
                    <Text style={[styles.suggestionText, isDark ? styles.textWhite : styles.textDark]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : session.messages.length === 0 ? (
          <View style={styles.welcomeCard}>
            <View style={styles.sparkleBadge}>
              <Image
                source={{ uri: "https://raw.githubusercontent.com/win117282025-stack/just-deksuai-icon/refs/heads/main/WhatsApp%20Image%202026-08-04%20at%2019.58.46.jpeg" }}
                style={styles.welcomeBadgeImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.welcomeTitle, isDark ? styles.textWhite : styles.textDark]}>
              {t.startDialogue}
            </Text>
            <Text style={[styles.welcomeSub, isDark ? styles.textMutedDark : styles.textMutedLight]}>
              {t.startDialogueDesc}
            </Text>

            <View style={styles.suggestionList}>
              <Text style={styles.labelHeader}>{t.tryAsking}</Text>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => onSelectSuggestion(s)}
                  style={[
                    styles.suggestionItem,
                    isDark ? styles.suggestionItemDark : styles.suggestionItemLight,
                  ]}
                >
                  <Text style={[styles.suggestionText, isDark ? styles.textWhite : styles.textDark]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.messageList}>
            {session.messages.map((msg) => {
              const isAI = msg.role === "model";
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isAI ? styles.rowAI : styles.rowUser,
                  ]}
                >
                  {isAI && (
                    <View style={styles.aiAvatar}>
                      <Image
                        source={{ uri: "https://raw.githubusercontent.com/win117282025-stack/just-deksuai-icon/refs/heads/main/WhatsApp%20Image%202026-08-04%20at%2019.58.46.jpeg" }}
                        style={styles.aiAvatarImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <View style={styles.bubbleStack}>
                    <View
                      style={[
                        styles.bubble,
                        isAI
                          ? isDark
                            ? styles.bubbleAIDark
                            : styles.bubbleAILight
                          : styles.bubbleUser,
                      ]}
                    >
                      {isAI ? (
                        msg.id === session.messages[session.messages.length - 1].id ? (
                          <Typewriter text={msg.text} speed={10} delay={8}>
                            {(typedText) => formatMessageText(typedText, true)}
                          </Typewriter>
                        ) : (
                          formatMessageText(msg.text, true)
                        )
                      ) : (
                        <View style={styles.userBubbleContainer}>
                          {formatMessageText(msg.text, false)}
                          <TouchableOpacity
                            onPress={() => setInputText(msg.text)}
                            style={styles.editPromptBtn}
                            accessibilityLabel={t.editPrompt}
                          >
                            <Edit3 color="rgba(255, 255, 255, 0.7)" size={12} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Matched Sources Citations */}
                    {isAI && msg.matchedSources && msg.matchedSources.length > 0 && (
                      <View style={styles.sourcesContainer}>
                        <BookMarked color="#10B981" size={12} />
                        <Text style={styles.sourcesLabel}>
                          {t.matchedSources} ({msg.matchedSources.length}):
                        </Text>
                        <View style={styles.sourcesBadges}>
                          {msg.matchedSources.map((src) => (
                            <View key={src.id} style={styles.sourceBadge}>
                              <Layers color="#10B981" size={10} />
                              <Text style={styles.sourceBadgeText}>{src.title}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {isSending && (
              <View style={[styles.messageRow, styles.rowAI]}>
                <View style={styles.aiAvatar}>
                  <Image
                    source={{ uri: "https://raw.githubusercontent.com/win117282025-stack/just-deksuai-icon/refs/heads/main/WhatsApp%20Image%202026-08-04%20at%2019.58.46.jpeg" }}
                    style={styles.aiAvatarImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={[styles.bubble, isDark ? styles.bubbleAIDark : styles.bubbleAILight, styles.loadingBubble]}>
                  <ActivityIndicator color="#0078D4" size="small" />
                  <Text style={styles.loadingText}>{t.scanning}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Input container */}
      {session && (
        <View style={[styles.inputBar, isDark ? styles.borderDark : styles.borderLight]}>
          <View style={[styles.inputContainer, isDark ? styles.inputDark : styles.inputLight]}>
            <TextInput
              style={[
                styles.textInput,
                isDark ? styles.textWhite : styles.textDark,
                { maxHeight: 100 },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t.askPlaceholder}
              placeholderTextColor={isDark ? "#616161" : "#A0A0A0"}
              multiline
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!inputText.trim() || isSending}
              style={[
                styles.sendBtn,
                (!inputText.trim() || isSending) && styles.sendBtnDisabled,
              ]}
            >
              <Send color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </View>
          <View style={styles.inputFooterRow}>
            <Text style={styles.groundingFooterText}>
              ✨ {t.groundingPowered}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
  bgDark: {
    backgroundColor: "#202020",
  },
  bgLight: {
    backgroundColor: "#f3f3f3",
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  menuBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  menuBtnDark: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  menuBtnLight: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  headerLogoContainer: {
    position: "relative",
    width: 28,
    height: 28,
  },
  headerLogoImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  statusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#282828",
  },
  headerTitleStack: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  onlineStatus: {
    fontSize: 10,
    color: "#616161",
    fontWeight: "500",
  },
  groundingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  groundingBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#10B981",
    textTransform: "uppercase",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 120, 212, 0.1)",
  },
  langBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0078D4",
  },
  themeBtn: {
    padding: 8,
    borderRadius: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  welcomeCard: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 500,
    alignSelf: "center",
    marginVertical: "auto",
    paddingHorizontal: 16,
  },
  sparkleBadge: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  welcomeBadgeImage: {
    width: "100%",
    height: "100%",
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  suggestionBox: {
    width: "100%",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardDark: {
    backgroundColor: "#282828",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
  },
  suggestionBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suggestionBoxTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#0078D4",
  },
  suggestionList: {
    gap: 8,
    width: "100%",
  },
  labelHeader: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#A0A0A0",
    marginBottom: 4,
  },
  suggestionItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionItemDark: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  suggestionItemLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#E5E5E5",
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  messageList: {
    gap: 16,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  messageRow: {
    flexDirection: "row",
    gap: 12,
  },
  rowAI: {
    justifyContent: "flex-start",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#0078D4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  aiAvatarImage: {
    width: "100%",
    height: "100%",
  },
  bubbleStack: {
    maxWidth: "82%",
    flexShrink: 1,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: "100%",
  },
  bubbleAIDark: {
    backgroundColor: "#282828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleAILight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  bubbleUser: {
    backgroundColor: "#0078D4",
  },
  messageTextContainer: {
    gap: 4,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  messageParagraph: {
    fontSize: 13,
    lineHeight: 20,
    // @ts-ignore
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: "#616161",
    fontWeight: "500",
  },
  sourcesContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingLeft: 4,
  },
  sourcesLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#616161",
  },
  sourcesBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10B981",
  },
  inputBar: {
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 48,
  },
  inputDark: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0078D4",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  inputFooterRow: {
    alignItems: "center",
  },
  groundingFooterText: {
    fontSize: 10,
    color: "#616161",
    fontWeight: "600",
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
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 12,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    // @ts-ignore
    wordBreak: "break-word",
  },
  inlineCodeDark: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#E0E7FF",
  },
  inlineCodeLight: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    color: "#4338CA",
  },
  codeBlockContainer: {
    marginVertical: 8,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    maxWidth: "100%",
    overflow: "hidden",
  },
  codeBlockDark: {
    backgroundColor: "#282828",
    borderColor: "#2d2d2d",
  },
  codeBlockLight: {
    backgroundColor: "#2d2d2d",
    borderColor: "#444444",
  },
  codeBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 4,
  },
  codeBlockLang: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  codeBlockText: {
    fontFamily: "monospace",
    color: "#f3f3f3",
    fontSize: 12,
    lineHeight: 18,
    // @ts-ignore
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginVertical: 2,
    paddingLeft: 4,
  },
  bulletPoint: {
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 20,
  },
  userBubbleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    maxWidth: "100%",
  },
  editPromptBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "flex-start",
    flexShrink: 0,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    // @ts-ignore
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  moreOptionsBtn: {
    padding: 8,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 50,
    paddingRight: 16,
  },
  optionsDropdown: {
    width: 220,
    borderRadius: 8,
    padding: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
  },
  optionsDark: {
    backgroundColor: "#2d2d2d",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  optionsLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
  },
  optionsHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0078D4",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  optionsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionsItemText: {
    fontSize: 13,
    fontWeight: "600",
  },
  renameModalContent: {
    width: 300,
    borderRadius: 8,
    padding: 20,
    gap: 12,
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
    borderWidth: 1,
  },
  renameModalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  renameInput: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  renameInputDark: {
    backgroundColor: "#282828",
    borderColor: "rgba(255, 255, 255, 0.15)",
    color: "#f3f3f3",
  },
  renameInputLight: {
    backgroundColor: "#f3f3f3",
    borderColor: "#CBD5E1",
    color: "#282828",
  },
  renameModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  renameCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renameCancelText: {
    color: "#616161",
    fontWeight: "600",
    fontSize: 13,
  },
  renameSaveBtn: {
    backgroundColor: "#0078D4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renameSaveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
