// Les dialogues du Fil Rouge (plan 15 §2). RÈGLES D'ÉCRITURE :
// 3 boîtes max par temps de dialogue (le ch. 6 du Mercier a droit à 5),
// MAJUSCULES comme le reste du jeu, une pointe d'humour par PNJ, jamais
// de pavé, jamais d'explication de mécanique que l'UI donne déjà.
//
// Ton : l'humour absurde et les jeux de mots de Dofus, la chaleur et
// les PNJ attachants de Genshin. Chaque voix a son tic : Brioche parle
// en proverbes de cuisine, la Régisseuse panique avec méthode, Yuumi
// dort debout, le Vieux Pic bougonne avec tendresse, la Sphinge parle
// en énigmes, le Mercier vend même ses souvenirs.

export interface Replique {
  /** id de PNJ, 'chleatoune', ou 'narrateur' */
  qui: string;
  texte: string;
}

export const DIALOGUES: Record<string, Replique[]> = {
  // ---- chapitre 1 : Grand-Mère Brioche (proverbes de cuisine)
  ch1_rencontre: [
    { qui: 'brioche', texte: 'UN MONDE, C’EST COMME UNE PÂTE : ÇA SE PÉTRIT TOUS LES JOURS.' },
    { qui: 'brioche', texte: 'ET CELUI-CI RETOMBE COMME UN SOUFFLÉ, PETITE. REGARDE LES BORDS DU CIEL : ÇA S’EFFILOCHE.' },
    { qui: 'brioche', texte: 'RAPPORTE-MOI 150 SMISKI. ON NE RECOUD RIEN LE VENTRE VIDE — PROVERBE DE FOUR, ARTICLE PREMIER.' },
  ],
  ch1_retour: [
    { qui: 'brioche', texte: 'BRAVE PETITE. TIENS : LA BOBINE VERTE. JE LA GARDAIS DANS LA FARINE, LES VOLEURS ONT HORREUR DE ÇA.' },
    { qui: 'brioche', texte: 'IL Y EN A SIX COMME ELLE, DIT-ON. TROUVE-LES TOUTES… ET LE FIL TE MÈNERA CHEZ LUI.' },
  ],

  // ---- chapitre 2 : la Régisseuse (panique organisée)
  ch2_rencontre: [
    { qui: 'regisseuse', texte: 'LE CONCERT EST DANS… AUCUNE IDÉE, LE TEMPS S’EST EFFILOCHÉ AUSSI ! J’AI TOUT NOTÉ, MAIS SUR QUOI ?!' },
    { qui: 'regisseuse', texte: 'LA MÉLODIE SE DÉTEND, LES NOTES TOMBENT DU CIEL COMME DES MOUCHES. IL ME FAUT 300 MIKU POUR RETENDRE LE FIL.' },
    { qui: 'regisseuse', texte: 'VITE. ENFIN, QUAND TU PEUX. MAIS VITE. C’EST NOTÉ QUELQUE PART, ÇA AUSSI.' },
  ],
  ch2_cercle: [
    { qui: 'regisseuse', texte: 'PARFAIT ! MAINTENANT : AU CENTRE DE LA SCÈNE, ET NE BOUGE PLUS. LA MUSIQUE DÉTESTE COURIR APRÈS SON PUBLIC.' },
    { qui: 'regisseuse', texte: 'VINGT SECONDES D’IMMOBILITÉ. TU PEUX RESPIRER. MAIS EN RYTHME.' },
  ],
  ch2_fin: [
    { qui: 'regisseuse', texte: 'LA BOBINE TURQUOISE ! ELLE VIBRE ENCORE — ELLE A GARDÉ LE LA. ÉVIDEMMENT QU’ELLE A GARDÉ LE LA.' },
    { qui: 'regisseuse', texte: 'FILE AVANT QUE JE PLEURE SUR TON COSTUME. IL EST EN QUOI ? NON. NE DIS RIEN. J’AI DÉJÀ LES LARMES.' },
  ],

  // ---- chapitre 3 : Yuumi (gardienne mi-endormie du Métier)
  ch3_rencontre: [
    { qui: 'yuumi', texte: 'ZZZ… HMM ? AH. C’EST TOI. LE MÉTIER RÊVE. NE MARCHE PAS SUR SES FILS.' },
    { qui: 'yuumi', texte: 'IL DORT DEPUIS QUE SON MAÎTRE EST PARTI. NOURRIS-LE, ET IL TISSERA MÊME QUAND TU DORS. COMME MOI. SURTOUT COMME MOI.' },
  ],
  ch3_fin: [
    { qui: 'yuumi', texte: 'TU L’ENTENDS ? IL RONRONNE. C’EST LE MÉTIER QUI DIT MERCI. MOI AUSSI JE RONRONNE, MAIS C’EST SANS RAPPORT.' },
    { qui: 'yuumi', texte: 'LA BOBINE BRUNE ÉTAIT SOUS MON COUSSIN. ELLE EST À TOI. LE COUSSIN, NON. BONNE NUIT.' },
  ],

  // ---- chapitre 4 : le Vieux Pic (contremaître golemite bourru)
  ch4_rencontre: [
    { qui: 'vieuxpic', texte: 'ICI ON FORGEAIT SES AIGUILLES. LES VRAIES. CELLES QUI COUSENT DES MONTAGNES. TOUCHE À RIEN. …BON, TOUCHE UN PEU.' },
    { qui: 'vieuxpic', texte: '400 MINERAI ET JE RALLUME LA FORGE. ELLE S’EST ÉTEINTE LE JOUR OÙ IL EST PARTI. PAR POLITESSE, J’IMAGINE.' },
  ],
  ch4_forge: [
    { qui: 'vieuxpic', texte: 'VAS-Y. LE SOUFFLET EST AU FOND. SI ÇA CRACHE DES ÉTINCELLES, C’EST QUE ÇA MARCHE. SI ÇA CRACHE AUTRE CHOSE, COURS.' },
  ],
  ch4_fin: [
    { qui: 'vieuxpic', texte: 'ELLE CHANTE. TRENTE ANS QUE J’ATTENDAIS QU’ELLE CHANTE. C’EST DE LA POUSSIÈRE DANS MON ŒIL, ON EST D’ACCORD.' },
    { qui: 'vieuxpic', texte: 'TIENS : L’AIGUILLE DU COUTURIER. IL L’AVAIT LAISSÉE « POUR CELLE QUI VIENDRA ». ET LA BOBINE GRISE AVEC. FILE.' },
  ],

  // ---- chapitre 5 : la Sphinge des Sables (énigmes)
  ch5_rencontre: [
    { qui: 'sphinge', texte: 'ON M’A CONFIÉ UNE BOBINE ET TROIS QUESTIONS, PETITE POUPÉE. C’ÉTAIT IL Y A MILLE SIESTES, OU MARDI. LE SABLE CONFOND.' },
    { qui: 'sphinge', texte: '« QU’EST-CE QUI COUD SANS AIGUILLE, MARCHE SANS FIL, ET REVIENT TOUJOURS ? » …TOI, J’ESPÈRE. SUIS MES INDICES.' },
  ],
  ch5_fin: [
    { qui: 'sphinge', texte: 'LA BOBINE DORÉE. TU CREUSES BIEN, POUR QUELQU’UN SANS GRIFFES. LA RÉPONSE À L’ÉNIGME ÉTAIT « L’ESPOIR », MAIS J’ACCEPTE « UNE PELLE ».' },
  ],

  // ---- chapitre 6 : le Mercier raconte la disparition (5 boîtes, le seul long)
  ch6_recit: [
    { qui: 'mercier', texte: 'FOURNISSEUR OFFICIEL DE L’ATELIER DEPUIS TOUJOURS. C’EST ÉCRIT SUR L’ENSEIGNE. C’EST MOI QUI L’AI ÉCRIT, MAIS C’EST VRAI.' },
    { qui: 'mercier', texte: 'ALORS OUI : JE L’AI CONNU. LE GRAND COUTURIER. IL ACHETAIT MON FIL AU PRIX FORT ET MES BLAGUES À MOITIÉ PRIX.' },
    { qui: 'mercier', texte: 'UN SOIR, IL A POSÉ SON DÉ À COUDRE ET IL A DIT : « ELLE EST FINIE. IL NE LUI MANQUE QUE QUELQU’UN POUR EN PRENDRE SOIN. » ET IL A FERMÉ L’ATELIER.' },
    { qui: 'mercier', texte: 'DEPUIS, LA TAPISSERIE S’USE. CE N’EST LA FAUTE DE PERSONNE — TOUT CE QUI EST TISSÉ S’USE. MAIS L’USURE A PRIS UN VISAGE, ET ELLE T’ATTEND DERRIÈRE LA DOUZIÈME PORTE.' },
    { qui: 'mercier', texte: 'VA. ET PRENDS DU BON FIL. C’EST 20 % AUJOURD’HUI — NE LE RÉPÈTE PAS, ÇA RUINERAIT MA RÉPUTATION.' },
  ],
  ch6_fin: [
    { qui: 'mercier', texte: 'TU REVIENS ENTIÈRE. IL AURAIT SOURI, TU SAIS. IL SOURIAIT PEU, MAIS BIEN.' },
    { qui: 'mercier', texte: 'LA BOBINE VIOLETTE. LA DERNIÈRE. IL NE MANQUE PLUS QUE… AH. NON. TU VERRAS BIEN. VA À LA PORTE DU CHÂTEAU.' },
  ],

  // ---- la Grande Effilocheuse (avant la vague 1 de la porte 12, ch. 6 actif)
  effilocheuse_avant: [
    { qui: 'narrateur', texte: 'LE GIVRE SE FIGE. QUELQUE CHOSE DÉFAIT LES FILS DU MONDE, MAILLE PAR MAILLE, SANS COLÈRE ET SANS HÂTE.' },
    { qui: 'effilocheuse', texte: 'JE NE HAIS RIEN, PETITE POUPÉE. JE DÉFAIS. LA NUIT DÉFAIT LE JOUR, LA MER DÉFAIT LA PIERRE, MOI JE DÉFAIS LES POINTS. VIENS. VOYONS COMME TU ES COUSUE.' },
  ],
  effilocheuse_defaite: [
    { qui: 'effilocheuse', texte: 'BIEN COUSUE, DONC. …RECOUDS TANT QUE TU VEUX. TOUT CE QUI EST TISSÉ S’USE. MÊME TOI. MÊME MOI.' },
    { qui: 'effilocheuse', texte: 'MAIS C’EST PEUT-ÊTRE ÇA, ÊTRE AIMÉE : QUELQU’UN QUI CHOISIT DE REPRISER. ENCORE. ET ENCORE. JE LAISSE LA DÉCHIRURE OUVERTE — ON SE REVERRA AU FOND.' },
    { qui: 'narrateur', texte: 'LA DÉCHIRURE RESTERA. MAIS AUJOURD’HUI, LA TAPISSERIE TIENT.' },
  ],

  // ---- ambiances hors-quête (tirées au hasard, marqueur « … »)
  ambiance_brioche: [
    { qui: 'brioche', texte: 'LE SECRET D’UNE BONNE PÂTE ? ON NE LE DIT PAS. C’EST ÇA, LE SECRET.' },
  ],
  ambiance_regisseuse: [
    { qui: 'regisseuse', texte: 'LES PROJECTEURS ! NON. OUI. NON. …QUELQU’UN A VU LES PROJECTEURS ? ILS ÉTAIENT LÀ EN RÉPÉTITION !' },
  ],
  ambiance_yuumi: [
    { qui: 'yuumi', texte: 'ZZZ… JE NE DORS PAS. JE SURVEILLE L’INTÉRIEUR DE MES PAUPIÈRES. C’EST CALME. TOUT VA BIEN.' },
  ],
  ambiance_vieuxpic: [
    { qui: 'vieuxpic', texte: 'CE MINERAI NE SE RAMASSERA PAS TOUT SEUL. …COMMENT ÇA, « LES GOLEMITES » ? C’EST DE LA MAIN-D’ŒUVRE, PAS DU TOUT SEUL.' },
  ],
};
