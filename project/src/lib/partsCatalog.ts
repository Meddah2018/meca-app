export type PartCategory = {
  id: string;
  label: string;
};

export const PART_CATEGORIES: PartCategory[] = [
  { id: 'moteur', label: 'Moteur' },
  { id: 'embrayage', label: 'Embrayage' },
  { id: 'boite_vitesses', label: 'Boîte de vitesses' },
  { id: 'transmission', label: 'Transmission' },
  { id: 'suspension', label: 'Suspension' },
  { id: 'direction', label: 'Direction' },
  { id: 'freinage', label: 'Freinage' },
  { id: 'electricite', label: 'Électricité' },
  { id: 'electronique', label: 'Électronique' },
  { id: 'refroidissement', label: 'Refroidissement' },
  { id: 'climatisation', label: 'Climatisation' },
  { id: 'carrosserie', label: 'Carrosserie' },
  { id: 'eclairage', label: 'Éclairage' },
  { id: 'echappement', label: 'Échappement' },
  { id: 'filtration', label: 'Filtration' },
  { id: 'lubrifiants', label: 'Lubrifiants et consommables' },
  { id: 'roues_pneumatiques', label: 'Roues et pneumatiques' },
  { id: 'accessoires', label: 'Accessoires' },
  { id: 'autres', label: 'Autres' },
];

export const PARTS_BY_CATEGORY: Record<string, string[]> = {
  moteur: [
    'Bloc moteur', 'Culasse', 'Joint de culasse', 'Piston', 'Segment de piston', 'Axe de piston',
    'Bielle', 'Vilebrequin', 'Arbre à cames', 'Soupape d\'admission', 'Soupape d\'échappement',
    'Guide de soupape', 'Ressort de soupape', 'Culbuteur', 'Poussoir de soupape', 'Joint de queue de soupape',
    'Courroie de distribution', 'Chaîne de distribution', 'Tendeur de courroie de distribution', 'Galet tendeur de distribution',
    'Pompe à huile', 'Carter d\'huile', 'Bouchon de vidange', 'Jauge à huile', 'Radiateur d\'huile',
    'Bougies d\'allumage', 'Bougie de préchauffage', 'Injecteur', 'Rampe d\'injection', 'Pompe haute pression',
    'Pompe à vide', 'Collecteur d\'admission', 'Collecteur d\'échappement', 'Joint de collecteur d\'admission',
    'Joint de collecteur d\'échappement', 'Carter de distribution', 'Cache culbuteurs', 'Joint de cache culbuteurs',
    'Volant moteur', 'Butée de débrayage', 'Capteur de position de vilebrequin', 'Capteur d\'arbre à cames',
    'Son de lambda', 'Sonde lambda', 'Capteur de pression d\'huile', 'Capteur de température d\'huile',
    'Biellette de réglage', 'Couvercle de carter', 'Joint de vilebrequin avant', 'Joint de vilebrequin arrière',
  ],
  embrayage: [
    'Kit d\'embrayage', 'Disque d\'embrayage', 'Plateau de pression', 'Butée d\'embrayage', 'Butée hydraulique',
    'Volant moteur bi-masse', 'Cable d\'embrayage', 'Émetteur d\'embrayage', 'Récepteur d\'embrayage',
    'Fourchette de débrayage', 'Roulement de butée', 'Disque d\'embrayage renforcé', 'Plateau d\'embrayage',
    'Kit embrayage double', 'Maître cylindre d\'embrayage', 'Volant moteur simple', 'Rayure de disque',
  ],
  boite_vitesses: [
    'Boîte de vitesses manuelle', 'Boîte de vitesses automatique', 'Arbre primaire', 'Arbre secondaire',
    'Pignon de boîte', 'Synchro de boîte', 'Fourchette de boîte', 'Carter de boîte', 'Joint de boîte',
    'Roulement de boîte', 'Bague de boîte', 'Carter d\'embrayage', 'Couvercle de boîte', 'Axe de fourchette',
    'Pignon de marche arrière', 'Pignon de 5ème', 'Pignon de 4ème', 'Pignon de 3ème', 'Pignon de 2ème',
    'Pignon de 1ère', 'Câble de passage de vitesse', 'Tringlerie de passage de vitesse', 'Bloc de passage',
    'Capteur de vitesse', 'Capteur de position de boîte', 'Bouchon de remplissage', 'Bouchon de vidange de boîte',
  ],
  transmission: [
    'Arbre de transmission', 'Cardan', 'Joint de cardan', 'Croisillon', 'Support de cardan',
    'Arbre de transmission avant', 'Arbre de transmission arrière', 'Differential', 'Couronne de différentiel',
    'Pignon de différentiel', 'Satellite de différentiel', 'Boîtier de différentiel', 'Roulement de différentiel',
    'Demi-arbre', 'Fusée de roue', 'Moyeu de roue', 'Roulement de moyeu', 'Joint de moyeu', 'Goupille de cardan',
    'Bague d\'arbre', 'Support de transmission', 'Silentbloc de transmission', 'Arbre intermédiaire',
  ],
  suspension: [
    'Amortisseur avant', 'Amortisseur arrière', 'Appui de suspension', 'Axe de suspension', 'Ressort de suspension',
    'Ressort hélicoïdal', 'Ressort à lames', 'Bras de suspension', 'Bras de suspension avant', 'Bras de suspension arrière',
    'Rotule de suspension', 'Silentbloc de bras', 'Silentbloc de suspension', 'Bielle de barre stabilisatrice',
    'Barre stabilisatrice', 'Coussinet de barre stabilisatrice', 'Tête de suspension', 'Kit de suspension',
    'Amortisseur à gaz', 'Amortisseur pneumatique', 'Amortisseur réglable', 'Coupelle d\'amortisseur',
    'Coupelle de ressort', 'Bague de suspension', 'Axe de bras', 'Chape de suspension', 'Étrier de suspension',
    'Butée de suspension', 'Butée d\'amortisseur', 'Buteur de suspension', 'Roulement de suspension',
  ],
  direction: [
    'Crémaillère de direction', 'Colonne de direction', 'Volant de direction', 'Joint de direction',
    'Rotule de direction', 'Rotule axiale', 'Bielle de direction', 'Silentbloc de direction', 'Couvercle de crémaillère',
    'Pompe de direction assistée', 'Réservoir de direction assistée', 'Tuyau de direction assistée', 'Durit de direction',
    'Capteur d\'angle de direction', 'Cardan de direction', 'Arbre de direction', 'Support de crémaillère',
    'Roulement de colonne', 'Kit de crémaillère', 'Tête de rotule', 'Rotule de bielle', 'Bielle de barre stabilisatrice',
  ],
  freinage: [
    'Plaquettes de frein avant', 'Plaquettes de frein arrière', 'Disque de frein avant', 'Disque de frein arrière',
    'Étrier de frein avant', 'Étrier de frein arrière', 'Cylindre de roue', 'Maître cylindre de frein', 'Servo-frein',
    'Tambour de frein', 'Kit de tambour', 'Flexibles de frein', 'Durit de frein', 'Tuyau de frein', 'Réservoir de frein',
    'Capteur de plaquettes', 'Capteur de niveau de frein', 'Câble de frein à main', 'Étrier de frein à main',
    'Levier de frein à main', 'Disque de frein ventilé', 'Disque de frein plein', 'Kit de plaquettes', 'Garniture de frein',
    'Segment de frein', 'Ressort de segment', 'Axe de segment', 'Cylindre récepteur', 'Correcteur de freinage',
    'Compensateur de freinage', 'Vanne de freinage', 'Pédale de frein', 'Support d\'étrier', 'Chape d\'étrier',
  ],
  electricite: [
    'Alternateur', 'Démarreur', 'Bobine d\'allumage', 'Bobine d\'allumage avant', 'Bobine d\'allumage arrière',
    'Batterie', 'Câble de batterie', 'Câble de masse', 'Faisceau électrique', 'Boîtier de fusibles', 'Fusible',
    'Relais', 'Contacteur de démarrage', 'Neiman', 'Commodo', 'Contacteur de clé', 'Moteur de démarreur',
    'Stator d\'alternateur', 'Rotor d\'alternateur', 'Régulateur de tension', 'Redresseur', 'Diode d\'alternateur',
    'Balai d\'alternateur', 'Balai de démarreur', 'Porte-balai', 'Collecteur d\'alternateur', 'Capteur de charge',
    'Son de température', 'Sonde de température d\'eau', 'Sonde de pression d\'huile', 'Sonde de niveau de carburant',
    'Capteur de vitesse', 'Capteur de régime moteur', 'Capteur de position papillon', 'Capteur PMH', 'Sonde lambda',
  ],
  electronique: [
    'Calculateur moteur', 'Calculateur de boîte', 'Calculateur ABS', 'Calculateur ESP', 'Module de contrôle',
    'Boîtier BSI', 'Boîtier UCH', 'Capteur de position', 'Capteur de pression', 'Capteur de température', 'Capteur de vitesse',
    'Capteur d\'oxygène', 'Sonde lambda', 'Capteur de cliquetis', 'Capteur de position de papillon', 'Capteur de débit d\'air',
    'Débitmètre d\'air', 'Capteur de pression de rampe', 'Capteur de niveau', 'Capteur d\'angle', 'Capteur de pluie',
    'Capteur de luminosité', 'Capteur d\'angle de volant', 'Capteur d\'accélération', 'Capteur de choc', 'Capteur de présence',
    'Module d\'allumage', 'Module de puissance', 'Transistor de puissance', 'Diode', 'Résistance', 'Condensateur',
  ],
  refroidissement: [
    'Radiateur de refroidissement', 'Radiateur de chauffage', 'Vase d\'expansion', 'Bouchon de vase d\'expansion',
    'Pompe à eau', 'Thermostat', 'Calorstat', 'Joint de thermostat', 'Joint de pompe à eau', 'Durit de refroidissement',
    'Durit supérieure', 'Durit inférieure', 'Durit de chauffage', 'Ventilateur de refroidissement', 'Visco-coupleur',
    'Moteur de ventilateur', 'Sonde de température d\'eau', 'Radiateur d\'huile', 'Échangeur eau-huile', 'Échangeur air-eau',
    'Bouchon de radiateur', 'Joint de radiateur', 'Support de radiateur', 'Fixation de radiateur', 'Cale de ventilateur',
  ],
  climatisation: [
    'Compresseur de climatisation', 'Condenseur de climatisation', 'Évaporateur de climatisation', 'Filtre d\'habitacle',
    'Filtre à pollen', 'Vase de climatisation', 'Détendeur de climatisation', 'Sélecteur de climatisation', 'Capteur de pression',
    'Sonde de température de climatisation', 'Ventilateur de climatisation', 'Moteur de ventilation', 'Résistance de ventilation',
    'Commande de climatisation', 'Tableau de commande', 'Durit de climatisation', 'Tuyau de climatisation', 'Joint de compresseur',
    'Huile de climatisation', 'Recharge de climatisation', 'Bouteille déshydratante', 'Pressostat', 'Electrovanne de climatisation',
  ],
  carrosserie: [
    'Aile avant gauche', 'Aile avant droite', 'Aile arrière gauche', 'Aile arrière droite', 'Capot moteur', 'Capot de coffre',
    'Porte avant gauche', 'Porte avant droite', 'Porte arrière gauche', 'Porte arrière droite', 'Pare-chocs avant', 'Pare-chocs arrière',
    'Calandre', 'Grille de calandre', 'Bas de caisse gauche', 'Bas de caisse droit', 'Pavillon', 'Coffre', 'Jauge de coffre',
    'Rétroviseur gauche', 'Rétroviseur droit', 'Coquille de rétroviseur', 'Verre de rétroviseur', 'Support de rétroviseur',
    'Poignée de porte', 'Barillet de porte', 'Serrure de porte', 'Charnière de porte', 'Butée de porte', 'Joint de porte',
    'Joint de coffre', 'Joint de capot', 'Joint de pare-brise', 'Pare-brise', 'Lunette arrière', 'Vitre latérale', 'Vitre de porte',
    'Moulure de porte', 'Moulure de pare-chocs', 'Insert de carrosserie', 'Spoiler avant', 'Spoiler arrière', 'Becquet',
    'Marche-pied', 'Grille de protection', 'Couvercle de réservoir', 'Trapin', 'Tapis de coffre',
  ],
  eclairage: [
    'Phare avant gauche', 'Phare avant droit', 'Phare antibrouillard avant', 'Phare antibrouillard arrière', 'Feu arrière gauche',
    'Feu arrière droit', 'Feu de recul', 'Feu de plaque', 'Feu de détresse', 'Clignotant avant gauche', 'Clignotant avant droit',
    'Clignotant arrière gauche', 'Clignotant arrière droit', 'Répétiteur latéral', 'Troisième feu stop', 'Ampoule de phare',
    'Ampoule de feu', 'Ampoule de clignotant', 'Ampoule de plaque', 'Ampoule de stop', 'Ampoule de recul', 'Ampoule H7',
    'Ampoule H4', 'Ampoule H1', 'Ampoule H11', 'Ampoule W5W', 'Ampoule W21W', 'Ampoule P21W', 'Ampoule PY21W', 'Ampoule LED',
    'Verre de phare', 'Verre de feu', 'Support d\'ampoule', 'Douille d\'ampoule', 'Faisceau de phare', 'Faisceau de feu',
    'Projecteur', 'Optique avant', 'Optique arrière', 'Barre LED', 'Module de phare', 'Correcteur de portée', 'Moteur de phare',
  ],
  echappement: [
    'Ligne d\'échappement', 'Pot catalytique', 'FAP', 'Filtre à particules', 'Silencieux avant', 'Silencieux arrière',
    'Silencieux intermédiaire', 'Tuyau d\'échappement', 'Tube d\'échappement', 'Collecteur d\'échappement', 'Joint de collecteur',
    'Joint de pot catalytique', 'Joint de silencieux', 'Support de silencieux', 'Suspension de pot', 'Cales d\'échappement',
    'Sonde lambda avant', 'Sonde lambda arrière', 'Capteur de FAP', 'Capteur de pression de FAP', 'Flexible d\'échappement',
    'Embout d\'échappement', 'Queue de pot', 'Catalyseur', 'Ligne complète', 'Coudes d\'échappement', 'Manifold d\'échappement',
  ],
  filtration: [
    'Filtre à air', 'Filtre à huile', 'Filtre à carburant', 'Filtre à gasoil', 'Filtre à essence', 'Filtre d\'habitacle',
    'Filtre à pollen', 'Filtre de climatisation', 'Filtre de boîte', 'Filtre de direction assistée', 'Filtre de lave-glace',
    'Filtre de réservoir', 'Filtre de pompe', 'Filtre de retour', 'Filtre de gicleur', 'Filtre de carburateur', 'Filtre de purge',
  ],
  lubrifiants: [
    'Huile moteur', 'Huile de boîte', 'Huile de direction assistée', 'Huile de frein', 'Liquide de refroidissement',
    'Liquide de frein', 'Liquide de refroidissement', 'Liquide de lave-glace', 'Graisse', 'Graisse de roulement',
    'Additif moteur', 'Additif de carburant', 'Additif de FAP', 'Additif d\'huile', 'Nettoyant de carburant', 'Nettoyant d\'injecteur',
    'Nettoyant de carrosserie', 'Nettoyant de jante', 'Produit de polissage', 'Cire de carrosserie', 'Dégraissant',
  ],
  roues_pneumatiques: [
    'Pneu avant gauche', 'Pneu avant droit', 'Pneu arrière gauche', 'Pneu arrière droit', 'Pneu de secours', 'Jante avant',
    'Jante arrière', 'Jante en tôle', 'Jante en aluminium', 'Enjoliveur', 'Bouchon de jante', 'Valve de pneu', 'Valve de gonflage',
    'Capteur de pression de pneu', 'Capteur TPMS', 'Boulon de roue', 'Écrou de roue', 'Anti-vol de roue', 'Clé de roue', 'Croix de roue',
    'Cric', 'Roue de secours', 'Roue de secours temporaire', 'Kit de réparation de pneu', 'Compressoir de pneu', 'Mousse de pneu',
  ],
  accessoires: [
    'Tapis de sol', 'Tapis de sol avant', 'Tapis de sol arrière', 'Housses de siège', 'Housse de siège avant', 'Housse de siège arrière',
    'Support de téléphone', 'Chargeur de téléphone', 'Câble de charge', 'Câble USB', 'Prise USB', 'Prise allume-cigare', 'Adaptateur',
    'Rangement de coffre', 'Filet de coffre', 'Barre de toit', 'Barres de toit', 'Porte-vélo', 'Porte-skis', 'Attelage', 'Faisceau d\'attelage',
    'Bavette', 'Bavette avant', 'Bavette arrière', 'Tapis de coffre', 'Organisateur de coffre', 'Boîte de rangement', 'Support de tablette',
    'Parasol', 'Par-soleil', 'Couvre-volant', 'Couvre-tableau de bord', 'Désodorisant', 'Désodorisant de voiture', 'Stylo de retouche',
    'Kit de réparation de carrosserie', 'Kit de retouche peinture', 'Bombe de peinture', 'Chiffon microfibre', 'Éponge',
  ],
  autres: [
    'Pièce sur mesure', 'Pièce de réparation', 'Pièce d\'occasion', 'Pièce neuve', 'Pièce adaptable', 'Pièce d\'origine',
    'Autre pièce', 'Pièce non répertoriée',
  ],
};

export function searchParts(categoryId: string, query: string, limit = 20): string[] {
  const parts = PARTS_BY_CATEGORY[categoryId] ?? [];
  if (!query.trim()) return parts.slice(0, limit);
  const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return parts
    .filter(p => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalized))
    .slice(0, limit);
}
