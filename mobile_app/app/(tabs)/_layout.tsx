import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
    return (
        <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.tabLabel, { color: focused ? '#00d2ff' : 'rgba(255,255,255,0.4)' }]}>{label}</Text>
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarBackground: () => (
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                ),
                tabBarShowLabel: false,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="sessions"
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Sessions" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="new_session"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.fabWrapper}>
                            <View style={styles.fab}>
                                <Text style={styles.fabText}>＋</Text>
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon emoji="📄" label="Reports" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 78, borderTopWidth: 0,
        backgroundColor: 'transparent',
        elevation: 0,
    },
    tabItem: {
        alignItems: 'center', justifyContent: 'center',
        paddingTop: 8, gap: 4, opacity: 0.7,
    },
    tabItemFocused: { opacity: 1 },
    emoji: { fontSize: 22 },
    tabLabel: { fontSize: 10, fontWeight: '600' },
    fabWrapper: { alignItems: 'center', justifyContent: 'center', top: -18 },
    fab: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: '#00d2ff',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 16, elevation: 12,
        borderWidth: 3, borderColor: '#0f0c29',
    },
    fabText: { color: '#fff', fontSize: 26, fontWeight: '300', marginTop: -2 },
});
