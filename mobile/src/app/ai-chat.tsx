import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fragment, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAiAct, useAiChat } from '@/api/hooks';
import { PressableScale, Screen, Text } from '@/components/ui';
import { palette } from '@/theme/tokens';
import type { ChatAction, ChatMessage, ChatSource, SourceKind } from '@/types/ai';

type IconName = keyof typeof Ionicons.glyphMap;

const SOURCE_META: Record<SourceKind, { icon: IconName; href: (id: string) => string }> = {
  vendor: { icon: 'business-outline', href: (id) => `/vendor/${id}` },
  rfq: { icon: 'document-text-outline', href: (id) => `/rfqs/${id}` },
  quotation: { icon: 'pricetag-outline', href: (id) => `/quotations/${id}` },
  purchaseOrder: { icon: 'cart-outline', href: (id) => `/po/${id}` },
  invoice: { icon: 'receipt-outline', href: (id) => `/invoices/${id}` },
};

const ACTION_META: Record<string, { label: string; icon: IconName }> = {
  create_rfq: { label: 'Create RFQ', icon: 'document-text-outline' },
  add_vendor: { label: 'Add vendor', icon: 'business-outline' },
};

const SUGGESTIONS = [
  'Which invoices are overdue?',
  'Who are my top vendors by spend?',
  'Create an RFQ for 10 office chairs',
  'Add a vendor: Acme Corp, Electronics, Mumbai',
];

// ---- markdown-lite (bold + bullets), mirrors the web renderer ----
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <Text key={i} variant="bodyStrong">
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
function MessageBody({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, i) => {
        const m = line.match(/^\s*[-•*]\s+(.*)/);
        if (m) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text variant="body" style={styles.bulletDot}>
                •
              </Text>
              <Text variant="body" style={styles.flex}>
                {renderInline(m[1])}
              </Text>
            </View>
          );
        }
        if (!line.trim()) return null;
        return (
          <Text key={i} variant="body">
            {renderInline(line)}
          </Text>
        );
      })}
    </View>
  );
}

export default function AiChatScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const chat = useAiChat();
  const act = useAiAct();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [actingIndex, setActingIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || chat.isPending) return;
    setError('');
    setInput('');
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    scrollToEnd();
    try {
      const res = await chat.mutateAsync({ message, history });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res?.answer || '',
          sources: res?.sources || [],
          refused: Boolean(res?.refused),
          pendingAction: res?.pendingAction || null,
        },
      ]);
      scrollToEnd();
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong. Please try again.');
    }
  };

  const confirmAction = async (idx: number, action: ChatAction) => {
    if (actingIndex !== null) return;
    setError('');
    setActingIndex(idx);
    try {
      const result = await act.mutateAsync(action);
      setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, actionStatus: 'done' } : m)));
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message || 'Done.', actionResult: result }]);
      scrollToEnd();
    } catch (e) {
      setError((e as Error)?.message || 'Could not complete that action.');
    } finally {
      setActingIndex(null);
    }
  };

  const cancelAction = (idx: number) =>
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, actionStatus: 'cancelled' } : m)));

  const navigate = (href: string) => {
    router.back();
    router.push(href as never);
  };
  const navSource = (s: ChatSource) => {
    const meta = SOURCE_META[s.source];
    if (meta) navigate(meta.href(s.id));
  };
  const navResult = (kind: string | undefined, code: string | undefined) => {
    if (!code) return;
    navigate(kind === 'vendor' ? `/vendor/${code}` : `/rfqs/${code}`);
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headBadge}>
          <Ionicons name="sparkles" size={18} color={palette.white} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong" style={styles.headTitle}>
            Wolf AI
          </Text>
          <Text variant="caption" style={styles.headSub}>
            Knows your procurement data
          </Text>
        </View>
        {messages.length > 0 ? (
          <PressableScale haptic={false} style={styles.headBtn} onPress={() => setMessages([])}>
            <Ionicons name="refresh" size={18} color={palette.white} />
          </PressableScale>
        ) : null}
        <PressableScale haptic={false} style={styles.headBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={palette.white} />
        </PressableScale>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Ionicons name="sparkles" size={26} color={palette.violet600} />
              </View>
              <Text variant="heading">Ask me anything</Text>
              <Text variant="caption" color="textSecondary" center style={styles.emptyHint}>
                I answer from your live records — and can create RFQs or add vendors for you.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <PressableScale key={s} haptic={false} scaleTo={0.98} onPress={() => send(s)} style={styles.suggestion}>
                    <Text variant="body">{s}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m, i) =>
              m.role === 'user' ? (
                <View key={i} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text variant="body" style={styles.userText}>
                      {m.content}
                    </Text>
                  </View>
                </View>
              ) : (
                <View key={i} style={styles.aiRow}>
                  <View style={[styles.aiAvatar, m.refused && styles.aiAvatarWarn]}>
                    <Ionicons name="sparkles" size={13} color={palette.white} />
                  </View>
                  <View style={styles.aiMain}>
                    <View style={[styles.aiBubble, m.refused && styles.aiBubbleWarn]}>
                      <MessageBody text={m.content} />
                    </View>
                    {/* source chips */}
                    {m.sources && m.sources.length > 0 ? (
                      <View style={styles.chips}>
                        {m.sources.map((s) =>
                          SOURCE_META[s.source] ? (
                            <PressableScale key={`${s.source}-${s.id}`} haptic={false} onPress={() => navSource(s)} style={styles.chip}>
                              <Ionicons name={SOURCE_META[s.source].icon} size={11} color={palette.violet600} />
                              <Text variant="caption" style={styles.chipText}>
                                {s.id}
                              </Text>
                            </PressableScale>
                          ) : null,
                        )}
                      </View>
                    ) : null}
                    {/* pending action */}
                    {m.pendingAction && m.actionStatus !== 'cancelled' && m.actionStatus !== 'done' ? (
                      <View style={styles.actionCard}>
                        <View style={styles.actionTop}>
                          <Ionicons name="color-wand-outline" size={13} color={palette.violet600} />
                          <Text variant="caption" style={styles.actionTopText}>
                            Action proposed
                          </Text>
                        </View>
                        <Text variant="body" style={styles.actionSummary}>
                          {m.pendingAction.summary}
                        </Text>
                        <View style={styles.actionBtns}>
                          <PressableScale
                            haptic={false}
                            onPress={() => confirmAction(i, m.pendingAction as ChatAction)}
                            disabled={actingIndex !== null}
                            style={styles.confirmBtn}
                          >
                            {actingIndex === i ? (
                              <ActivityIndicator size="small" color={palette.white} />
                            ) : (
                              <Ionicons name="checkmark" size={14} color={palette.white} />
                            )}
                            <Text variant="caption" style={styles.confirmText}>
                              {ACTION_META[m.pendingAction.tool]?.label ?? 'Confirm'}
                            </Text>
                          </PressableScale>
                          <PressableScale haptic={false} onPress={() => cancelAction(i)} disabled={actingIndex !== null} style={styles.cancelBtn}>
                            <Text variant="caption" color="textSecondary">
                              Cancel
                            </Text>
                          </PressableScale>
                        </View>
                      </View>
                    ) : null}
                    {m.actionStatus === 'cancelled' ? (
                      <Text variant="caption" color="textMuted" style={styles.actionNote}>
                        Cancelled — nothing was saved.
                      </Text>
                    ) : null}
                    {/* action result link */}
                    {m.actionResult?.code ? (
                      <PressableScale haptic={false} onPress={() => navResult(m.actionResult?.kind, m.actionResult?.code)} style={styles.resultLink}>
                        <Ionicons name="arrow-forward-circle-outline" size={14} color={palette.violet600} />
                        <Text variant="caption" style={styles.chipText}>
                          View {m.actionResult.code}
                        </Text>
                      </PressableScale>
                    ) : null}
                  </View>
                </View>
              ),
            )
          )}

          {chat.isPending ? (
            <View style={styles.aiRow}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={13} color={palette.white} />
              </View>
              <View style={[styles.aiBubble, styles.typing]}>
                <ActivityIndicator size="small" color={palette.violet600} />
              </View>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text variant="caption" color="danger">
                {error}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Composer */}
        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about vendors, invoices, spend…"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              multiline
              onSubmitEditing={() => send()}
              blurOnSubmit={false}
              returnKeyType="send"
            />
            <PressableScale haptic={false} onPress={() => send()} disabled={!input.trim() || chat.isPending} style={[styles.sendBtn, (!input.trim() || chat.isPending) && styles.sendBtnOff]}>
              <Ionicons name="send" size={15} color={palette.white} />
            </PressableScale>
          </View>
          <Text variant="caption" color="textMuted" center style={styles.disclaimer}>
            AI can make mistakes — verify important figures.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: palette.violet600,
  },
  headBadge: { width: 36, height: 36, borderRadius: theme.radius.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: palette.white },
  headSub: { color: 'rgba(255,255,255,0.8)' },
  headBtn: { width: 36, height: 36, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  empty: { alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.huge },
  emptyBadge: { width: 56, height: 56, borderRadius: theme.radius.lg, backgroundColor: palette.violet50, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  emptyHint: { maxWidth: 260 },
  suggestions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  suggestion: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md },
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '85%', backgroundColor: palette.violet600, borderRadius: theme.radius.lg, borderBottomRightRadius: 4, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  userText: { color: palette.white },
  aiRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: theme.radius.sm, backgroundColor: palette.violet600, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  aiAvatarWarn: { backgroundColor: theme.colors.warning },
  aiMain: { flex: 1, maxWidth: '85%', gap: theme.spacing.xs },
  aiBubble: { backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderTopLeftRadius: 4, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  aiBubbleWarn: { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning },
  typing: { alignSelf: 'flex-start', paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  bulletRow: { flexDirection: 'row', gap: theme.spacing.sm },
  bulletDot: { color: palette.violet600 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.violet100, backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.sm, paddingVertical: 3 },
  chipText: { color: palette.violet600, fontWeight: '600' },
  actionCard: { borderWidth: 1, borderColor: palette.violet100, backgroundColor: palette.violet50, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionTopText: { color: palette.violet600, fontWeight: '700' },
  actionSummary: {},
  actionBtns: { flexDirection: 'row', gap: theme.spacing.sm },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.violet600, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  confirmText: { color: palette.white, fontWeight: '700' },
  cancelBtn: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, justifyContent: 'center' },
  actionNote: { fontStyle: 'italic' },
  resultLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: palette.violet100, backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: 4 },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radius.md, padding: theme.spacing.md },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  input: { flex: 1, fontSize: 15, color: theme.colors.text, maxHeight: 110, paddingVertical: 2 },
  sendBtn: { width: 36, height: 36, borderRadius: theme.radius.md, backgroundColor: palette.violet600, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.4 },
  disclaimer: { marginTop: 6 },
}));
