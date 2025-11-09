import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

type Props = {
  onLogin: (credentials: { username: string; password: string }) => void;
  isLoading?: boolean;
  errorText?: string;
  errorDetails?: string;
};

const EklaseLoginScreen: React.FC<Props> = ({ onLogin, isLoading, errorText, errorDetails }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleLogin = () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setError('');
    onLogin({ username, password });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to E-klase</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { marginTop: 10 }]}
        placeholder="Password"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}
      {!!errorDetails && (
        <TouchableOpacity onPress={() => setShowDetails(!showDetails)}>
          <Text style={styles.moreLink}>{showDetails ? 'Hide details' : 'Why did it fail?'}</Text>
        </TouchableOpacity>
      )}
      {showDetails && !!errorDetails && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsText}>{errorDetails}</Text>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.button, isLoading ? { opacity: 0.6 } : null]}
        onPress={handleLogin}
        disabled={!!isLoading}
      >
        {isLoading ? <ActivityIndicator color="#052e16" /> : <Text style={styles.buttonText}>Log In</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14,
  },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    color: '#e2e8f0',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },
  button: {
    marginTop: 14,
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '800',
  },
  moreLink: {
    color: '#60a5fa',
    fontSize: 12,
    marginTop: 8,
  },
  detailsBox: {
    marginTop: 8,
    width: '100%',
    backgroundColor: '#0b1220',
    borderRadius: 8,
    padding: 10,
  },
  detailsText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
});

export default EklaseLoginScreen;


