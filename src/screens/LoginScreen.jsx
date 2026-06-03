import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Input from '../components/Input';
import Button from '../components/Button';
import { AuthContext } from '../context/AuthContext';

const REMEMBER_USERNAME_KEY = 'lastLoginUsername';

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberUsername, setRememberUsername] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSavedUsername = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem(REMEMBER_USERNAME_KEY);
        if (savedUsername) {
          setEmail(savedUsername);
          setRememberUsername(true);
        }
      } catch (e) {
        console.error('Failed to load saved username', e);
      }
    };
    loadSavedUsername();
  }, []);

  const handleLogin = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(normalizedEmail, password);
      if (rememberUsername) {
        await AsyncStorage.setItem(REMEMBER_USERNAME_KEY, normalizedEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBER_USERNAME_KEY);
      }
      // AuthContext will update token, Root component will switch navigator
    } catch (_e) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Input placeholder="Email" value={email} onChangeText={setEmail} />
      <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity
        style={styles.rememberRow}
        onPress={() => setRememberUsername((prev) => !prev)}
      >
        <View style={[styles.checkbox, rememberUsername && styles.checkboxActive]}>
          {rememberUsername && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.rememberText}>Remember account</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
      <Button
        title="Register"
        onPress={() => navigation.navigate('Register')}
        style={{ marginTop: 12, backgroundColor: '#555' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  error: { color: 'red', marginVertical: 8, textAlign: 'center' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: { backgroundColor: '#2f95dc', borderColor: '#2f95dc' },
  checkboxMark: { color: '#fff', fontWeight: 'bold', lineHeight: 16 },
  rememberText: { fontSize: 14, color: '#555' },
});

export default LoginScreen;
