/**
 * Words on the app's main screens, in English and Hindi.
 *
 * The games' instructions and the 25-item check-in stay English for now: the
 * check-in is a measurement instrument, and a translated questionnaire needs
 * its own checked translation before its scores can be compared. Add a key
 * here and both languages must have it (strings.test.ts fails otherwise).
 */
export const EN = {
  'tab.review': 'Admin',
  'tab.patients': 'Patients',
  'tab.today': 'Today',
  'tab.games': 'Games',
  'tab.checkin': 'Check-in',
  'tab.profile': 'Profile',

  'dash.hello': 'Hello',
  'dash.helloName': 'Hello, {name}',
  'dash.streak': 'Day streak',
  'dash.today': 'Today',
  'dash.week': 'This week',
  'dash.next': 'Suggested next',
  'dash.play': 'Play {game}',
  'dash.trained': 'Trained',
  'dash.trainedHelp': 'How you are doing in the games. Higher is better.',
  'dash.noGames': 'No games played yet. Your progress will show up here.',
  'dash.avg': '{pct}% right on average',

  'profile.title': 'Profile',
  'profile.guest': 'Guest',
  'profile.notSignedIn': 'Not signed in',
  'profile.settings': 'Settings',
  'profile.signOut': 'Sign out',

  'login.title': 'Welcome back',
  'login.subtitle': 'Sign in to continue.',
  'login.create': 'New here? Create a patient or doctor account',
  'login.guest': 'Continue without an account',
  'login.guestNote':
    'You can use the exercises without signing in. An account is only needed to share your progress with a doctor.',

  'welcome.title': 'Welcome',
  'welcome.subtitle': "A few brain exercises, a few minutes a day. Let's start with your name.",
  'welcome.name': 'Your name',
  'welcome.age': 'Your age (optional)',
  'welcome.continue': 'Continue',

  'legal.terms': 'Terms and conditions',
  'legal.privacy': 'Privacy policy',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.languageNote': 'Games and the check-in questions are in English for now.',
  'settings.legal': 'Terms and privacy',
  'settings.thisPhone': 'This phone',
  'settings.erase': 'Erase everything on this phone',
  'settings.eraseNote':
    'Removes names, check-ins and game results stored on this phone. Anything already shared with your doctor stays on the server.',
  'settings.eraseConfirm': 'Yes, erase this phone',
  'settings.erased': 'Everything on this phone has been erased.',
  'settings.account': 'Your account',
  'settings.deletePatient': 'Delete my account',
  'settings.deletePatientNote':
    'Deletes your account and everything shared from it: results, check-ins, doctor connections and notes. This cannot be undone.',
  'settings.closeDoctor': 'Close my doctor account',
  'settings.closeDoctorNote':
    'Ends every patient connection and stops you signing in. Notes you wrote stay in your patients’ records, as medical notes must.',
  'settings.password': 'Type your password to confirm',
  'settings.confirmDelete': 'Delete for ever',
  'settings.confirmClose': 'Close my account',
  'settings.cancel': 'Cancel',
  'settings.adminNote': 'An administrator account cannot be deleted from the app.',
  'settings.wrongPassword': 'That password is not right.',
  'settings.failed': 'That did not work. Please try again.',
} as const;

export type Key = keyof typeof EN;

export const HI: Record<Key, string> = {
  'tab.review': 'एडमिन',
  'tab.patients': 'मरीज़',
  'tab.today': 'आज',
  'tab.games': 'खेल',
  'tab.checkin': 'जाँच',
  'tab.profile': 'प्रोफ़ाइल',

  'dash.hello': 'नमस्ते',
  'dash.helloName': 'नमस्ते, {name}',
  'dash.streak': 'लगातार दिन',
  'dash.today': 'आज',
  'dash.week': 'इस हफ़्ते',
  'dash.next': 'अगला सुझाव',
  'dash.play': '{game} खेलें',
  'dash.trained': 'अभ्यास',
  'dash.trainedHelp': 'खेलों में आप कैसा कर रहे हैं। ज़्यादा बेहतर है।',
  'dash.noGames': 'अभी तक कोई खेल नहीं खेला। आपकी प्रगति यहाँ दिखेगी।',
  'dash.avg': 'औसतन {pct}% सही',

  'profile.title': 'प्रोफ़ाइल',
  'profile.guest': 'मेहमान',
  'profile.notSignedIn': 'साइन इन नहीं किया',
  'profile.settings': 'सेटिंग्स',
  'profile.signOut': 'साइन आउट',

  'login.title': 'फिर से स्वागत है',
  'login.subtitle': 'आगे बढ़ने के लिए साइन इन करें।',
  'login.create': 'नए हैं? मरीज़ या डॉक्टर का खाता बनाएँ',
  'login.guest': 'बिना खाते के आगे बढ़ें',
  'login.guestNote':
    'आप बिना साइन इन किए अभ्यास कर सकते हैं। खाता सिर्फ़ डॉक्टर के साथ अपनी प्रगति साझा करने के लिए चाहिए।',

  'welcome.title': 'स्वागत है',
  'welcome.subtitle': 'रोज़ कुछ मिनट, दिमाग़ के कुछ अभ्यास। चलिए आपके नाम से शुरू करते हैं।',
  'welcome.name': 'आपका नाम',
  'welcome.age': 'आपकी उम्र (ज़रूरी नहीं)',
  'welcome.continue': 'आगे बढ़ें',

  'legal.terms': 'नियम और शर्तें',
  'legal.privacy': 'गोपनीयता नीति',

  'settings.title': 'सेटिंग्स',
  'settings.language': 'भाषा',
  'settings.languageNote': 'खेल और जाँच के सवाल अभी अंग्रेज़ी में हैं।',
  'settings.legal': 'नियम और गोपनीयता',
  'settings.thisPhone': 'यह फ़ोन',
  'settings.erase': 'इस फ़ोन से सब कुछ मिटाएँ',
  'settings.eraseNote':
    'इस फ़ोन पर रखे नाम, जाँच और खेल के नतीजे हट जाएँगे। जो डॉक्टर के साथ पहले से साझा है, वह सर्वर पर रहेगा।',
  'settings.eraseConfirm': 'हाँ, इस फ़ोन से मिटाएँ',
  'settings.erased': 'इस फ़ोन से सब कुछ मिटा दिया गया है।',
  'settings.account': 'आपका खाता',
  'settings.deletePatient': 'मेरा खाता हटाएँ',
  'settings.deletePatientNote':
    'आपका खाता और उससे साझा की गई हर चीज़ हट जाएगी: नतीजे, जाँच, डॉक्टर से जुड़ाव और नोट्स। यह वापस नहीं हो सकता।',
  'settings.closeDoctor': 'मेरा डॉक्टर खाता बंद करें',
  'settings.closeDoctorNote':
    'हर मरीज़ से जुड़ाव ख़त्म होगा और आप साइन इन नहीं कर पाएँगे। आपके लिखे नोट्स मरीज़ों के रिकॉर्ड में रहेंगे, जैसा मेडिकल नोट्स के लिए ज़रूरी है।',
  'settings.password': 'पुष्टि के लिए अपना पासवर्ड लिखें',
  'settings.confirmDelete': 'हमेशा के लिए हटाएँ',
  'settings.confirmClose': 'मेरा खाता बंद करें',
  'settings.cancel': 'रद्द करें',
  'settings.adminNote': 'एडमिन खाता ऐप से हटाया नहीं जा सकता।',
  'settings.wrongPassword': 'यह पासवर्ड सही नहीं है।',
  'settings.failed': 'यह नहीं हो पाया। कृपया फिर से कोशिश करें।',
};
