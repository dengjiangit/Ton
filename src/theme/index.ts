import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  colors: {
    brand: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },
    dark: {
      50: '#f7fafc',
      100: '#edf2f7',
      200: '#e2e8f0',
      300: '#cbd5e0',
      400: '#a0aec0',
      500: '#718096',
      600: '#4a5568',
      700: '#2d3748',
      800: '#1a202c',
      900: '#171923',
    }
  },
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        color: 'white',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: 'xl',
      },
      variants: {
        solid: {
          bg: 'transparent',
          border: '2px solid',
          borderColor: 'white',
          color: 'white',
          _hover: {
            bg: 'white',
            color: 'brand.800',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          },
          transition: 'all 0.3s ease',
        },
        outline: {
          border: '2px solid',
          borderColor: 'white',
          color: 'white',
          _hover: {
            bg: 'whiteAlpha.200',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'whiteAlpha.900',
          color: 'gray.800',
          borderRadius: '2xl',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
  },
}) 