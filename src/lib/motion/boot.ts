export {}

if (document.querySelector('[data-anim]')) {
  void import('./index').then(({ register }) => register())
}
