(() => {
  const phrases = new Map([
    ['HELLO', 'Hello!'],
    ['HOW ARE YOU', 'How are you?'],
    ['THANK YOU', 'Thank you!']
  ]);
  window.bridgeuxResolveAslPhrase = spelling => phrases.get(String(spelling || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase()) || '';
})();
