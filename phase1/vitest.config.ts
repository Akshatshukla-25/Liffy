import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      'react-native': 'react-native-web',
      'react-native-reanimated': path.resolve(__dirname, './tests/mocks/reanimated.ts'),
      'expo-haptics': path.resolve(__dirname, './tests/mocks/haptics.ts'),
      'react-native-svg': path.resolve(__dirname, './tests/mocks/svg.ts'),
      'lucide-react-native': path.resolve(__dirname, './tests/mocks/lucide.ts'),
    },
  },
  define: {
    __DEV__: true,
  },
});
