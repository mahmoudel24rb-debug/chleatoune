// Les dialogues du Fil Rouge (plan 15 §2). RÈGLES D'ÉCRITURE :
// 3 boîtes max par temps de dialogue (le ch. 6 du Mercier a droit à 5),
// MAJUSCULES comme le reste du jeu, une pointe d'humour par PNJ, jamais
// de pavé, jamais d'explication de mécanique que l'UI donne déjà.
//
// ⚠ Les textes marqués [DIALOGUE À ÉCRIRE] sont des PLACEHOLDERS
// VOLONTAIRES : c'est TA voix, tu les écris. Ils doivent survivre
// jusqu'à ta relecture — l'IA ne les remplit JAMAIS. Chaque PNJ a une
// réplique d'exemple qui donne le TON.

export interface Replique {
  /** id de PNJ, 'chleatoune', ou 'narrateur' */
  qui: string;
  texte: string;
}

export const DIALOGUES: Record<string, Replique[]> = {
  // ---- chapitre 1 : Grand-Mère Brioche (proverbes de cuisine)
  ch1_rencontre: [
    { qui: 'brioche', texte: 'UN MONDE, C’EST COMME UNE PÂTE : ÇA SE PÉTRIT TOUS LES JOURS.' },
    { qui: 'brioche', texte: 'ET CELUI-CI S’EFFILOCHE, PETITE. REGARDE LES BORDS DU CIEL. [DIALOGUE À ÉCRIRE]' },
    { qui: 'brioche', texte: 'RAPPORTE-MOI 150 SMISKI. ON NE RECOUD RIEN LE VENTRE VIDE.' },
  ],
  ch1_retour: [
    { qui: 'brioche', texte: 'BRAVE PETITE. TIENS : LA BOBINE VERTE. LA PREMIÈRE MAILLE EST À TOI. [DIALOGUE À ÉCRIRE]' },
  ],

  // ---- chapitre 2 : la Régisseuse (panique organisée)
  ch2_rencontre: [
    { qui: 'regisseuse', texte: 'LE CONCERT EST DANS… AUCUNE IDÉE, LE TEMPS S’EST EFFILOCHÉ AUSSI !' },
    { qui: 'regisseuse', texte: 'IL ME FAUT 300 MIKU POUR RETENDRE LE FIL DE LA MÉLODIE. VITE. ENFIN, QUAND TU PEUX. VITE. [DIALOGUE À ÉCRIRE]' },
  ],
  ch2_cercle: [
    { qui: 'regisseuse', texte: 'PARFAIT ! MAINTENANT : AU CENTRE DE LA SCÈNE, ET NE BOUGE PLUS. LA MUSIQUE FAIT LE RESTE. [DIALOGUE À ÉCRIRE]' },
  ],
  ch2_fin: [
    { qui: 'regisseuse', texte: 'LA BOBINE TURQUOISE ! ELLE VIBRE ENCORE. FILE AVANT QUE JE PLEURE SUR TON COSTUME. [DIALOGUE À ÉCRIRE]' },
  ],

  // ---- chapitre 3 : Yuumi (gardienne mi-endormie du Métier)
  ch3_rencontre: [
    { qui: 'yuumi', texte: 'LE MÉTIER RÊVE. NE MARCHE PAS SUR SES FILS.' },
    { qui: 'yuumi', texte: 'NOURRIS-LE, ET IL TISSERA MÊME QUAND TU DORS. COMME MOI. SURTOUT COMME MOI. [DIALOGUE À ÉCRIRE]' },
  ],
  ch3_fin: [
    { qui: 'yuumi', texte: 'IL RONRONNE. C’EST LE MÉTIER QUI DIT MERCI. LA BOBINE BRUNE EST À TOI. [DIALOGUE À ÉCRIRE]' },
  ],

  // ---- chapitre 4 : le Vieux Pic (contremaître golemite bourru)
  ch4_rencontre: [
    { qui: 'vieuxpic', texte: 'ICI ON FORGEAIT SES AIGUILLES. TOUCHE À RIEN. …BON, TOUCHE UN PEU.' },
    { qui: 'vieuxpic', texte: '400 MINERAI ET JE RALLUME LA FORGE. ELLE DORT DEPUIS QUE LUI EST PARTI. [DIALOGUE À ÉCRIRE]' },
  ],
  ch4_forge: [
    { qui: 'vieuxpic', texte: 'VAS-Y. LE SOUFFLET EST AU FOND. ET SI ÇA CRACHE DES ÉTINCELLES, C’EST QUE ÇA MARCHE. [DIALOGUE À ÉCRIRE]' },
  ],
  ch4_fin: [
    { qui: 'vieuxpic', texte: 'L’AIGUILLE DU COUTURIER. GARDE-LA. ET LA BOBINE GRISE AVEC. FILE, J’AI DE LA POUSSIÈRE DANS L’ŒIL. [DIALOGUE À ÉCRIRE]' },
  ],

  // ---- chapitre 5 : la Sphinge des Sables (énigmes)
  ch5_rencontre: [
    { qui: 'sphinge', texte: 'ON M’A CONFIÉ UNE BOBINE ET TROIS QUESTIONS, PETITE POUPÉE.' },
    { qui: 'sphinge', texte: 'LES QUESTIONS SONT GRATUITES. LES RÉPONSES SE MÉRITENT. SUIS MES INDICES. [DIALOGUE À ÉCRIRE]' },
  ],
  ch5_fin: [
    { qui: 'sphinge', texte: 'LA BOBINE DORÉE. TU CREUSES BIEN, POUR QUELQU’UN SANS GRIFFES. [DIALOGUE À ÉCRIRE]' },
  ],

  // ---- chapitre 6 : le Mercier raconte la disparition (5 boîtes, le seul long)
  ch6_recit: [
    { qui: 'mercier', texte: 'FOURNISSEUR OFFICIEL DE L’ATELIER DEPUIS TOUJOURS. C’EST ÉCRIT SUR L’ENSEIGNE.' },
    { qui: 'mercier', texte: 'ALORS OUI : JE L’AI CONNU. LE GRAND COUTURIER. [DIALOGUE À ÉCRIRE]' },
    { qui: 'mercier', texte: '[DIALOGUE À ÉCRIRE — la disparition, ce qu’il a laissé derrière lui]' },
    { qui: 'mercier', texte: '[DIALOGUE À ÉCRIRE — pourquoi l’Effilocheuse défait la tapisserie]' },
    { qui: 'mercier', texte: 'DERRIÈRE LA DOUZIÈME PORTE, ELLE T’ATTEND. PRENDS DU BON FIL.' },
  ],
  ch6_fin: [
    { qui: 'mercier', texte: 'LA BOBINE VIOLETTE. LA DERNIÈRE. IL NE MANQUE PLUS QUE… AH. TU VERRAS BIEN. [DIALOGUE À ÉCRIRE]' },
  ],

  // ---- la Grande Effilocheuse (avant la vague 1 de la porte 12, ch. 6 actif)
  effilocheuse_avant: [
    { qui: 'narrateur', texte: 'LE GIVRE SE FIGE. QUELQUE CHOSE DÉFAIT LES FILS DU MONDE, MAILLE PAR MAILLE.' },
    { qui: 'effilocheuse', texte: 'JE NE HAIS RIEN, PETITE POUPÉE. JE DÉFAIS. C’EST MA NATURE. [DIALOGUE À ÉCRIRE]' },
  ],
  effilocheuse_defaite: [
    { qui: 'effilocheuse', texte: 'RECOUDS TANT QUE TU VEUX. TOUT CE QUI EST TISSÉ S’USE. MÊME TOI. [DIALOGUE À ÉCRIRE]' },
    { qui: 'narrateur', texte: 'LA DÉCHIRURE RESTERA. MAIS AUJOURD’HUI, LA TAPISSERIE TIENT.' },
  ],

  // ---- ambiances hors-quête (tirées au hasard, marqueur « … »)
  ambiance_brioche: [{ qui: 'brioche', texte: 'LE SECRET D’UNE BONNE PÂTE ? ON NE LE DIT PAS. [DIALOGUE À ÉCRIRE]' }],
  ambiance_regisseuse: [{ qui: 'regisseuse', texte: 'LES PROJECTEURS ! NON. OUI. NON. …OÙ SONT LES PROJECTEURS ? [DIALOGUE À ÉCRIRE]' }],
  ambiance_yuumi: [{ qui: 'yuumi', texte: 'ZZZ… HMM ? JE VEILLAIS. [DIALOGUE À ÉCRIRE]' }],
  ambiance_vieuxpic: [{ qui: 'vieuxpic', texte: 'CE MINERAI NE SE RAMASSERA PAS TOUT SEUL. ENFIN SI, AVEC TES GOLEMITES. [DIALOGUE À ÉCRIRE]' }],
};
