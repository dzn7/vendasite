module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    tailwindcss: {
      config: './tailwind.config.js',
    },
    autoprefixer: {
      // Adiciona prefixos para navegadores com mais de 0.2% de uso global
      // e versões não suportadas
      overrideBrowserslist: [
        '> 0.2%',
        'last 2 versions',
        'not dead',
        'not op_mini all',
        'not ie <= 11',
        'not ie_mob <= 11'
      ],
      // Habilita a adição de prefixos para propriedades de grade CSS
      grid: 'autoplace',
      // Habilita a adição de prefixos para propriedades de aparência
      flexbox: 'no-2009'
    },
    // Adiciona suporte para recursos CSS modernos
    'postcss-preset-env': {
      stage: 1,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'custom-media-queries': true,
        'custom-selectors': true,
        'color-mod-function': true,
        'media-query-ranges': true,
        'custom-properties': {
          preserve: false,
          variables: {}
        },
        // Desativa avisos para propriedades com prefixos
        'autoprefixer': {
          add: true,
          remove: true,
          supports: true,
          flexbox: true,
          grid: true
        }
      }
    },
    // Remove comentários em produção
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  },
}
