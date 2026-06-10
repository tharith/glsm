import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'glms',
    themes: {
      glms: {
        dark: false,
        colors: {
          primary:    '#1A2744',
          secondary:  '#C9A227',
          accent:     '#2D4080',
          success:    '#0F7A5A',
          error:      '#C0392B',
          warning:    '#D97706',
          info:       '#0369A1',
          background: '#F0F2F7',
          surface:    '#FFFFFF',
        },
      },
    },
  },
  defaults: {
    VBtn:       { rounded: 'lg', elevation: 0 },
    VCard:      { rounded: 'xl', elevation: 1 },
    VTextField: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VSelect:    { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VTextarea:  { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VDataTable: { hover: true },
    VChip:      { rounded: 'lg' },
  },
})
