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
      },
      '*:focus-visible': {
        outline: 'none !important',
        boxShadow: 'none !important',
      },
      'input:focus, input:focus-visible, textarea:focus, textarea:focus-visible': {
        border: '1px solid #9CA3AF !important',
        outline: 'none !important',
        boxShadow: 'none !important',
      },
      'button:focus, button:focus-visible, button[type="button"]:focus, button[type="button"]:focus-visible': {
        border: '1px solid #9CA3AF !important',
        outline: 'none !important',
        boxShadow: 'none !important',
      },
      'button:focus:not([data-dropdown-button]):not([data-action-button])': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      'button:focus-visible:not([data-dropdown-button]):not([data-action-button])': {
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
      },
      'button[data-dropdown-button]:focus, button[data-dropdown-button]:focus-visible, button[data-dropdown-button]:active': {
        border: '1px solid #9CA3AF !important',
        outline: 'none !important',
        boxShadow: 'none !important',
      },
      'button[data-action-button]:focus, button[data-action-button]:focus-visible, button[data-action-button]:active': {
        border: '1px solid !important',
        outline: 'none !important',
        boxShadow: 'none !important',
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
        h: '30px',
        fontSize: 'xs',
        border: 'none',
        boxShadow: 'none',
        _focus: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
          border: 'none',
        },
        _focusVisible: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
          border: 'none',
        },
        _hover: {
          boxShadow: 'none',
          border: 'none',
        },
        _active: {
          boxShadow: 'none',
          border: 'none',
        },
      },
      variants: {
        solid: {
          border: 'none',
          boxShadow: 'none',
          _hover: {
            border: 'none',
            boxShadow: 'none',
          },
          _focus: {
            border: 'none',
            boxShadow: 'none',
          },
          _active: {
            border: 'none',
            boxShadow: 'none',
          },
        },
      },
    },
    IconButton: {
      baseStyle: {
        border: 'none',
        _focus: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
          border: 'none',
        },
        _focusVisible: {
          boxShadow: 'none',
          outline: 'none',
          ring: 'none',
          ringOffset: 'none',
          border: 'none',
        },
        _hover: {
          boxShadow: 'none',
          border: 'none',
        },
        _active: {
          boxShadow: 'none',
          border: 'none',
        },
        '& svg': {
          filter: 'none !important',
          textShadow: 'none !important',
          boxShadow: 'none !important',
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
    ModalCloseButton: {
      baseStyle: {
        bg: 'blue.50',
        borderRadius: 'md',
        border: 'none',
        boxShadow: 'none',
        _hover: {
          bg: 'blue.100',
          border: 'none',
          boxShadow: 'none',
        },
        _active: {
          bg: 'blue.200',
          border: 'none',
          boxShadow: 'none',
        },
        _focus: {
          bg: 'blue.50',
          boxShadow: 'none',
          border: 'none',
          outline: 'none',
        },
        _focusVisible: {
          boxShadow: 'none',
          border: 'none',
          outline: 'none',
        },
      },
    },
    DrawerCloseButton: {
      baseStyle: {
        bg: 'blue.50',
        borderRadius: 'md',
        border: 'none',
        boxShadow: 'none',
        _hover: {
          bg: 'blue.100',
          border: 'none',
          boxShadow: 'none',
        },
        _active: {
          bg: 'blue.200',
          border: 'none',
          boxShadow: 'none',
        },
        _focus: {
          bg: 'blue.50',
          boxShadow: 'none',
          border: 'none',
          outline: 'none',
        },
        _focusVisible: {
          boxShadow: 'none',
          border: 'none',
          outline: 'none',
        },
      },
    },
    Accordion: {
      baseStyle: {
        container: {
          border: 'none',
        },
      },
    },
    AccordionItem: {
      baseStyle: {
        border: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        _first: {
          borderTop: 'none',
        },
        _last: {
          borderBottom: 'none',
        },
      },
    },
    AccordionButton: {
      baseStyle: {
        border: 'none !important',
        bg: 'transparent !important',
        boxShadow: 'none !important',
        _hover: {
          border: 'none !important',
          bg: 'transparent !important',
          boxShadow: 'none !important',
        },
        _focus: {
          border: 'none !important',
          bg: 'transparent !important',
          boxShadow: 'none !important',
        },
        _active: {
          border: 'none !important',
          bg: 'transparent !important',
          boxShadow: 'none !important',
        },
        _expanded: {
          border: 'none !important',
          bg: 'transparent !important',
          boxShadow: 'none !important',
        },
      },
    },
    Code: {
      baseStyle: {
        bg: 'gray.100',
        color: 'gray.800',
      },
    },
    Select: {
      baseStyle: {
        field: {
          border: '1px solid',
          borderColor: 'gray.300',
          _hover: {
            bg: 'gray.50',
            borderColor: 'gray.400',
          },
          _focus: {
            boxShadow: 'none',
            borderColor: 'gray.400',
            outline: 'none',
          },
          _focusVisible: {
            boxShadow: 'none',
            borderColor: 'gray.400',
            outline: 'none',
          },
        },
      },
    },
  },
});

export default theme;

