// AsyncStorage is a native module, so tests use the library's own in-memory stand-in for the phone's storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated's own test setup (D1): its worklets runtime is the library's Jest stand-in, animations run on Jest's
// clock, and `toHaveAnimatedStyle` reads an animated style.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
require('react-native-reanimated').setUpTests();

// Haptics are native: tests get stand-ins that resolve and do nothing, and a test can read what was asked for.
jest.mock('expo-haptics', () => ({
  ...jest.requireActual('expo-haptics'),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));
