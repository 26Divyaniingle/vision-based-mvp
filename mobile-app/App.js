import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotTokenScreen from './src/screens/auth/ForgotTokenScreen';
import DashboardScreen from './src/screens/main/DashboardScreen';
import ConsultationScreen from './src/screens/main/ConsultationScreen';
import ResultsScreen from './src/screens/main/ResultsScreen';
import AIChatbotScreen from './src/screens/main/AIChatbotScreen';
import TranscriberScreen from './src/screens/main/TranscriberScreen';
import ConsultationDetailScreen from './src/screens/main/ConsultationDetailScreen';

import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#0a0a14' },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotToken" component={ForgotTokenScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="AIChatbot" component={AIChatbotScreen} />
          <Stack.Screen name="Consultation" component={ConsultationScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="Transcriber" component={TranscriberScreen} />
          <Stack.Screen name="ConsultationDetail" component={ConsultationDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
