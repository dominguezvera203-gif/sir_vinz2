import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, Keyboard, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');
const db = SQLite.openDatabaseSync('todo_v5.db');

const TAGS = ['None', 'Urgent', 'Reminder', 'Work', 'Personal'];

interface Task {
  id: number;
  title: string;
  description: string;
  tag: string;
  created_at: string;
  completed: number;
}

const AbstractBackground = ({ isDark }: { isDark: boolean }) => {
  const move1 = useSharedValue(0);
  const move2 = useSharedValue(0);

  useEffect(() => {
    move1.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    move2.value = withDelay(1500, withRepeat(withTiming(1, { duration: 12000 }), -1, true));
  }, []);

  const blobStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(move1.value, [0, 1], [-50, 80]) },
      { translateY: interpolate(move1.value, [0, 1], [0, 150]) }
    ],
    opacity: interpolate(move1.value, [0, 1], [0.1, 0.3])
  }));

  const blobStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(move2.value, [0, 1], [width, width - 180]) },
      { translateY: interpolate(move2.value, [0, 1], [height - 100, height - 350]) }
    ],
    opacity: interpolate(move2.value, [0, 1], [0.1, 0.25])
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.blob, blobStyle1, { backgroundColor: isDark ? '#3b82f6' : '#bfdbfe' }]} />
      <Animated.View style={[styles.blob, blobStyle2, { backgroundColor: isDark ? '#8b5cf6' : '#ddd6fe' }]} />
    </View>
  );
};

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeActionsId, setActiveActionsId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', desc: '', tag: 'None' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', onConfirm: () => {} });

  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#09090b' : '#ffffff',
    foreground: isDark ? '#fafafa' : '#09090b',
    muted: isDark ? '#27272a' : '#f4f4f5',
    mutedForeground: isDark ? '#a1a1aa' : '#71717a',
    border: isDark ? '#27272a' : '#e4e4e7',
    primary: isDark ? '#fafafa' : '#18181b',
    primaryForeground: isDark ? '#18181b' : '#fafafa',
    accent: '#8b5cf6'
  };

  useEffect(() => {
    db.execSync(`CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, tag TEXT, created_at TEXT, completed INTEGER);`);
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    setTasks(db.getAllSync('SELECT * FROM tasks ORDER BY id DESC') as any);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (editingId) {
      db.runSync('UPDATE tasks SET title = ?, description = ?, tag = ? WHERE id = ?', [form.title, form.desc, form.tag, editingId]);
    } else {
      db.runSync('INSERT INTO tasks (title, description, tag, created_at, completed) VALUES (?, ?, ?, ?, ?)', [form.title, form.desc, form.tag, now, 0]);
    }
    setForm({ title: '', desc: '', tag: 'None' });
    setIsAdding(false);
    setEditingId(null);
    fetchTasks();
    Keyboard.dismiss();
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ title, message, onConfirm });
    setModalVisible(true);
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Urgent': return '#ef4444';
      case 'Reminder': return '#3b82f6';
      case 'Work': return '#8b5cf6';
      case 'Personal': return '#10b981';
      default: return colors.mutedForeground;
    }
  };

  return (
    <ThemedView style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      <AbstractBackground isDark={isDark} />
      
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ThemedText style={styles.modalTitle}>{modalConfig.title}</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: colors.mutedForeground }]}>{modalConfig.message}</ThemedText>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.muted }]} onPress={() => setModalVisible(false)}>
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#ef4444' }]} onPress={() => { modalConfig.onConfirm(); setModalVisible(false); }}>
                <ThemedText style={{ color: '#fff' }}>Confirm</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Task List</ThemedText>
            <ThemedText style={{ color: colors.mutedForeground }}>{tasks.length} tasks recorded</ThemedText>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => confirmAction("Clear All", "Delete all tasks?", () => { db.runSync('DELETE FROM tasks'); fetchTasks(); })} style={styles.circleBtn}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </Pressable>
            <Pressable onPress={() => setIsAdding(!isAdding)} style={[styles.circleBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name={isAdding ? "close" : "add"} size={24} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>

        {isAdding && (
          <View style={[styles.form, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(9,9,11,0.9)' : 'rgba(255,255,255,0.9)' }]}>
            <TextInput placeholder="Title" value={form.title} onChangeText={(t) => setForm({...form, title: t})} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, fontWeight: '600' }]} />
            <TextInput placeholder="Notes" value={form.desc} onChangeText={(t) => setForm({...form, desc: t})} multiline style={[styles.input, { color: colors.foreground, height: 50, borderBottomWidth: 0 }]} placeholderTextColor={colors.mutedForeground} />
            
            <View style={{ marginTop: 8 }}>
              <ThemedText style={styles.label}>Select Tag</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                {TAGS.map(tag => (
                  <Pressable key={tag} onPress={() => setForm({...form, tag})} style={[styles.tagBadge, { borderColor: form.tag === tag ? colors.accent : colors.border, backgroundColor: form.tag === tag ? colors.accent + '20' : 'transparent' }]}>
                    <ThemedText style={{ fontSize: 12, color: form.tag === tag ? colors.accent : colors.mutedForeground }}>{tag}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={{ color: colors.primaryForeground, fontWeight: '600' }}>Save Task</ThemedText>
            </Pressable>
          </View>
        )}

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          renderItem={({ item }) => (
            <Pressable 
              onLongPress={() => { LayoutAnimation.easeInEaseOut(); setActiveActionsId(activeActionsId === item.id ? null : item.id); }}
              onPress={() => { LayoutAnimation.easeInEaseOut(); setExpandedId(expandedId === item.id ? null : item.id); setActiveActionsId(null); }}
              style={[styles.taskCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(9,9,11,0.5)' : 'rgba(255,255,255,0.5)' }]}
            >
              {activeActionsId === item.id && (
                <View style={styles.floatingActions}>
                  <Pressable onPress={() => { setForm({title: item.title, desc: item.description, tag: item.tag}); setEditingId(item.id); setIsAdding(true); setActiveActionsId(null); }} style={styles.miniBtn}>
                    <Ionicons name="pencil" size={14} color={colors.foreground} />
                  </Pressable>
                  <Pressable onPress={() => confirmAction("Delete", "Remove task?", () => { db.runSync('DELETE FROM tasks WHERE id = ?', [item.id]); fetchTasks(); })} style={[styles.miniBtn, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="trash" size={14} color="#ef4444" />
                  </Pressable>
                </View>
              )}

              <View style={styles.taskHeaderRow}>
                <Pressable onPress={() => { db.runSync('UPDATE tasks SET completed = ? WHERE id = ?', [item.completed === 1 ? 0 : 1, item.id]); fetchTasks(); }}>
                  <View style={[styles.checkbox, { borderColor: colors.primary }, item.completed === 1 && { backgroundColor: colors.primary }]}>
                    {item.completed === 1 && <Ionicons name="checkmark" size={12} color={colors.primaryForeground} />}
                  </View>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ThemedText style={styles.taskTitle}>{item.title}</ThemedText>
                    {item.tag !== 'None' && (
                      <View style={[styles.smallTag, { backgroundColor: getTagColor(item.tag) + '20', borderColor: getTagColor(item.tag) }]}>
                        <ThemedText style={{ fontSize: 9, color: getTagColor(item.tag), fontWeight: '700' }}>{item.tag.toUpperCase()}</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[styles.smallText, { color: colors.mutedForeground }]}>{item.created_at}</ThemedText>
                </View>
              </View>

              {expandedId === item.id && (
                <View style={styles.expandedContent}>
                  <ThemedText style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>{item.description || "No notes."}</ThemedText>
                </View>
              )}
            </Pressable>
          )}
        />
      </View>
      
      <View style={[styles.fixedFooter, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <ThemedText style={[styles.footerText, { color: colors.mutedForeground }]}>Developed by Vera Bianca Dominguez</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, filter: 'blur(80px)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerActions: { flexDirection: 'row', gap: 10 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7' },
  form: { padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 20, gap: 4 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 4, opacity: 0.6 },
  tagBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  smallTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 0.5 },
  input: { fontSize: 14, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#e4e4e7' },
  saveBtn: { height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  taskCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, position: 'relative' },
  floatingActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6, zIndex: 10 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f4f5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7' },
  taskHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  smallText: { fontSize: 11, marginTop: 2 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#e4e4e7' },
  fixedFooter: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(228, 228, 231, 0.3)' },
  footerText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 24, borderRadius: 20, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});