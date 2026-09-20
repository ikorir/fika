// AsyncStorage is a native module, so tests use the library's own in-memory stand-in for the phone's storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
