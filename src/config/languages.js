/**
 * Language learning content configuration
 * Each language contains lessons with vocabulary, translations, and quiz prompts
 */
const languages = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    nativeLanguage: 'he',
    lessons: {
      1: {
        title: 'Greetings & Introductions',
        words: [
          { word: 'hello', translation: 'שלום', example: 'Hello, how are you?' },
          { word: 'good morning', translation: 'בוקר טוב', example: 'Good morning! Did you sleep well?' },
          { word: 'my name is', translation: 'שמי', example: 'My name is David.' },
          { word: 'nice to meet you', translation: 'נעים להכיר', example: 'Nice to meet you!' },
          { word: 'how are you', translation: 'מה שלומך', example: 'How are you today?' }
        ],
        quizPrompt: "Say: 'Hello, my name is [your name]. Nice to meet you!'"
      },
      2: {
        title: 'Common Phrases',
        words: [
          { word: 'thank you', translation: 'תודה', example: 'Thank you very much!' },
          { word: 'please', translation: 'בבקשה', example: 'Please help me.' },
          { word: 'excuse me', translation: 'סליחה', example: 'Excuse me, where is the bathroom?' },
          { word: 'I am sorry', translation: 'אני מצטער', example: 'I am sorry for being late.' },
          { word: 'you are welcome', translation: 'על לא דבר', example: 'You are welcome!' }
        ],
        quizPrompt: "Say: 'Excuse me, please. Thank you!'"
      }
    }
  },
  es: {
    name: 'Spanish',
    flag: '🇪🇸',
    nativeLanguage: 'he',
    lessons: {
      1: {
        title: 'Saludos y Presentaciones',
        words: [
          { word: 'hola', translation: 'שלום', example: '¡Hola! ¿Cómo estás?' },
          { word: 'buenos días', translation: 'בוקר טוב', example: '¡Buenos días! ¿Dormiste bien?' },
          { word: 'me llamo', translation: 'שמי', example: 'Me llamo David.' },
          { word: 'mucho gusto', translation: 'נעים להכיר', example: '¡Mucho gusto!' },
          { word: 'cómo estás', translation: 'מה שלומך', example: '¿Cómo estás hoy?' }
        ],
        quizPrompt: "Di: 'Hola, me llamo [tu nombre]. ¡Mucho gusto!'"
      },
      2: {
        title: 'Frases Comunes',
        words: [
          { word: 'gracias', translation: 'תודה', example: '¡Muchas gracias!' },
          { word: 'por favor', translation: 'בבקשה', example: 'Por favor, ayúdame.' },
          { word: 'perdón', translation: 'סליחה', example: 'Perdón, ¿dónde está el baño?' },
          { word: 'lo siento', translation: 'אני מצטער', example: 'Lo siento por llegar tarde.' },
          { word: 'de nada', translation: 'על לא דבר', example: '¡De nada!' }
        ],
        quizPrompt: "Di: 'Perdón, por favor. ¡Gracias!'"
      }
    }
  },
  fr: {
    name: 'French',
    flag: '🇫🇷',
    nativeLanguage: 'he',
    lessons: {
      1: {
        title: 'Salutations et Présentations',
        words: [
          { word: 'bonjour', translation: 'שלום', example: 'Bonjour! Comment allez-vous?' },
          { word: 'bonne journée', translation: 'יום טוב', example: 'Bonne journée!' },
          { word: 'je m\'appelle', translation: 'שמי', example: 'Je m\'appelle David.' },
          { word: 'enchanté', translation: 'נעים להכיר', example: 'Enchanté!' },
          { word: 'comment ça va', translation: 'מה שלומך', example: 'Comment ça va aujourd\'hui?' }
        ],
        quizPrompt: "Dites: 'Bonjour, je m\'appelle [votre nom]. Enchanté!'"
      }
    }
  },
  de: {
    name: 'German',
    flag: '🇩🇪',
    nativeLanguage: 'he',
    lessons: {
      1: {
        title: 'Begrüßungen und Vorstellungen',
        words: [
          { word: 'hallo', translation: 'שלום', example: 'Hallo! Wie geht es dir?' },
          { word: 'guten Morgen', translation: 'בוקר טוב', example: 'Guten Morgen! Hast du gut geschlafen?' },
          { word: 'ich heiße', translation: 'שמי', example: 'Ich heiße David.' },
          { word: 'freut mich', translation: 'נעים להכיר', example: 'Freut mich!' },
          { word: 'wie geht es dir', translation: 'מה שלומך', example: 'Wie geht es dir heute?' }
        ],
        quizPrompt: "Sagen Sie: 'Hallo, ich heiße [Ihr Name]. Freut mich!'"
      }
    }
  }
};

module.exports = languages;
