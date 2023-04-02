module.exports = {
  '*.{ts,tsx}': ['eslint --max-warnings=-1', () => 'tsc-files --noEmit'],
  '*.{ts,tsx,json,css,js}': ['prettier --write']
}
