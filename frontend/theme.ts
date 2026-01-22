import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    blue: {
      50: '#e6f2ff',
      100: '#cce5ff',
      200: '#b3d8ff',
      300: '#99cbff',
      400: '#80beff',
      500: '#5ca3ff', // Primary blue - main accent color
      600: '#4a82cc',
      700: '#386299',
      800: '#264166',
      900: '#142133',
    },
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      '*:focus': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      '*:focus-visible': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      'button:focus': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      'button:focus-visible': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      '[role="button"]:focus': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      '[role="button"]:focus-visible': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      '[data-focus]': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      '[data-focus-visible]': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      // Light scrollbar styles
      '*::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '*::-webkit-scrollbar-track': {
        background: '#f5f5f5',
      },
      '*::-webkit-scrollbar-thumb': {
        background: '#d1d5db',
        borderRadius: '4px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        background: '#9ca3af',
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: '#d1d5db #f5f5f5',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'blue',
      },
      baseStyle: {
        _focus: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
        },
        _focusVisible: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
        },
      },
    },
    IconButton: {
      baseStyle: {
        _focus: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
        },
        _focusVisible: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
        },
      },
    },
    Link: {
      baseStyle: {
        color: 'blue.500',
        _hover: {
          color: 'blue.600',
          textDecoration: 'underline',
        },
      },
    },
    Modal: {
      baseStyle: {
        content: {
          boxShadow: 'xl',
        },
      },
    },
  },
});

export default theme;

