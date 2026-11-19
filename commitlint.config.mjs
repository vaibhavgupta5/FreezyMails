export default {
  ignores: [(message) => message.startsWith('Merge ')],
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [0],
    'header-max-length': [2, 'always', 100],
  },
}
