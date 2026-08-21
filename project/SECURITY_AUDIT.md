# Audit de sécurité — MécaPièces

Date : 2026-08-21
Périmètre : Supabase (RLS, Storage, fonctions Edge), frontend React/Vite, dépendances npm.
**Aucun correctif n'a été appliqué.** Tout le SQL/code ci-dessous est à valider point par point.

---

## Résumé exécutif

Bonne nouvelle d'abord : **RLS est activé sur les 10 tables** du schéma (`profiles`, `garage_profiles`,
`supplier_profiles`, `requests`, `offers`, `orders`, `reversements`, `ratings`, `supplier_brands`,
`impersonation_log`), et les deux bugs de récursion RLS historiques (profils, requests↔offers) ont déjà
été correctement corrigés avec des fonctions `SECURITY DEFINER`. La logique métier "un fournisseur ne voit
les offres concurrentes que s'il a lui-même déposé une offre" est bien implémentée
(`supplier_has_offer_on_request`).

Mais l'audit remonte **3 failles critiques** qui permettent, depuis le navigateur d'un utilisateur normal
(sans rien côté serveur) :
1. de s'auto-promouvoir administrateur,
2. de lire les cartes grises de n'importe quel autre utilisateur sans être connecté,
3. de truquer le montant cash collecté à la livraison.

Ce sont les trois points à corriger en premier.

| # | Titre | Sévérité |
|---|-------|----------|
| 1 | Auto-élévation de privilèges via `profiles_update_own` | 🔴 Critique |
| 2 | Buckets Storage publics (carte grise incluse) | 🔴 Critique |
| 3 | Création de commande sans validation serveur (`cash_amount`, `supplier_id`, date) | 🔴 Critique |
| 4 | Policies Storage non scopées au propriétaire (écriture/suppression) | 🟠 Élevé |
| 5 | Livreur voit et modifie **toutes** les commandes, pas seulement les siennes | 🟠 Élevé |
| 6 | Un mécanicien peut noter un fournisseur sans avoir jamais commandé | 🟠 Élevé |
| 7 | Un fournisseur peut modifier/forcer le statut de son offre après sélection | 🟠 Élevé |
| 8 | CORS `*` sur la fonction Edge `admin-users` | 🟡 Moyen |
| 9 | Une offre peut être déposée sur une demande déjà fermée | 🟡 Moyen |
| 10 | Aucun en-tête de sécurité HTTP (CSP, X-Frame-Options…) | 🟡 Moyen |
| 11 | Chemins de fichiers Storage peu aléatoires | 🟢 Faible |
| 12 | 18 vulnérabilités npm (devDependencies uniquement) | 🟢 Faible |

---

## 🔴 CRITIQUE

### 1. Auto-élévation de privilèges via `profiles_update_own`

**Fichier :** `supabase/migrations/20260729203742_mecapieces_initial_schema.sql:85-87`

```sql
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

**Risque métier concret :** cette policy vérifie uniquement "est-ce que je modifie ma propre ligne ?" —
elle ne restreint **aucune colonne**. N'importe quel mécanicien connecté peut, depuis la console du
navigateur, exécuter :

```js
await supabase.from('profiles').update({ role: 'admin' }).eq('id', monId);
```

`App.tsx` route l'interface uniquement sur `profile.role` lu en base (`src/App.tsx:60-72`), donc au
rechargement suivant l'utilisateur obtient l'écran **AdminDashboard complet**, avec accès à la gestion des
utilisateurs, aux réversements fournisseurs, à l'impersonation. Le même trou permet aussi de se
réactiver soi-même (`is_active`), de se marquer `is_approved`, d'écraser son `anonymous_reference` (usurper
la référence anonyme d'un autre profil affichée aux autres utilisateurs), ou de sauter la contrainte de
changement de mot de passe (`first_login_completed`).

**Correctif proposé** — trigger qui bloque toute modification de colonnes sensibles par un non-admin, tout
en laissant passer les écritures faites par la fonction Edge `admin-users` (clé `service_role`) :

```sql
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- La fonction Edge admin-users utilise la clé service_role : laisser passer.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
      OR NEW.login_id IS DISTINCT FROM OLD.login_id
      OR NEW.anonymous_reference IS DISTINCT FROM OLD.anonymous_reference
      OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
    THEN
      RAISE EXCEPTION 'Modification de champs protégés interdite';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_privilege_escalation();
```

Les colonnes restant modifiables par l'utilisateur lui-même (nom, téléphone, adresse, langue préférée…)
continuent de fonctionner sans changement côté frontend.

---

### 2. Buckets Storage publics — cartes grises exposées à tout Internet

**Fichiers :**
- `supabase/migrations/20260730093458_add_carte_grise_photo_to_requests.sql:516-518`
- `supabase/migrations/20260817140000_add_part_and_reference_photos_to_requests.sql:1234-1236`
- `supabase/migrations/20260817150000_add_request_audio_storage.sql:1270-1272`

Les 3 buckets sont créés avec `public = true`. **Un bucket public sert les fichiers directement via une URL
HTTP, en contournant totalement les policies RLS sur `storage.objects`.** Les policies `SELECT` créées à
côté (`carte_grise_read_all`, etc.) sont donc décoratives : elles ne s'appliquent qu'aux accès passant par
l'API authentifiée, jamais à l'URL publique.

**Risque métier concret :** `carte-grise` contient des photos de cartes grises (nom complet, adresse,
immatriculation du véhicule — donnée à caractère personnel). Le chemin de fichier est
`Date.now()-random.toString(36)` (`src/pages/MechanicDashboard.tsx:1188`), pas cryptographiquement fort,
mais même avec un chemin fort, le problème est que **n'importe qui possédant l'URL — collègue, capture
d'écran partagée, log de proxy, robot d'indexation — peut la consulter sans être connecté à
l'application**, sans jamais passer par une policy RLS. Idem pour les enregistrements audio des demandes.

**Correctif proposé — étape 1 (à faire immédiatement, ne casse rien niveau app) :** rendre les buckets
privés. Les policies `SELECT ... TO authenticated` existantes redeviennent alors la seule voie d'accès (il
faut alors changer `getPublicUrl()` en `createSignedUrl()` côté frontend, sinon les `<img src>` casseront) :

```sql
UPDATE storage.buckets SET public = false WHERE id IN ('carte-grise', 'part-photos', 'request-audio');
```

Côté frontend (exemple pour `carte-grise`, à répéter pour les 3 buckets, 3 sites d'appel dans
`src/pages/MechanicDashboard.tsx`) :

```diff
- const { data: urlData } = supabase.storage.from('carte-grise').getPublicUrl(filePath);
- setForm(f => ({ ...f, carte_grise_url: urlData.publicUrl }));
+ const { data: urlData } = await supabase.storage.from('carte-grise').createSignedUrl(filePath, 60 * 60 * 24 * 7);
+ setForm(f => ({ ...f, carte_grise_url: urlData?.signedUrl ?? '' }));
```

Et partout où ces URLs sont ré-affichées plus tard (liste des demandes, historique), il faudra régénérer
une URL signée à l'affichage plutôt que de réutiliser l'URL stockée en base, car les URLs signées
expirent.

**Étape 2 (recommandée, chantier plus large) :** avec l'étape 1 seule, *tout utilisateur authentifié* peut
encore lire la carte grise de n'importe quel autre utilisateur (la policy `SELECT` n'est scopée qu'au
bucket, pas au propriétaire — voir finding #4). Pour un vrai cloisonnement, il faudrait préfixer les
chemins par l'id du propriétaire (`{mechanic_id}/{filename}`) et réécrire les policies pour ne donner accès
qu'au propriétaire, aux fournisseurs ayant une offre active sur la demande liée, et à l'admin/livreur. Je
peux détailler ce point si vous voulez aller jusque-là — c'est un changement de convention de nommage des
fichiers, donc plus impactant que l'étape 1.

---

### 3. Création de commande : `cash_amount`, `supplier_id` et date de livraison ne sont jamais vérifiés côté serveur

**Fichier :** `src/pages/MechanicDashboard.tsx:291-329`

```js
const selectedAt = new Date();                              // horloge du navigateur
const deliveryDate = computeDeliveryDate(selectedAt);        // règle du cutoff 12h calculée en JS

const { error: orderError } = await supabase.from('orders').insert({
  offer_id: offer.id,
  mechanic_id: profile.id,
  supplier_id: offer.supplier_id,      // ← fourni par le client
  cash_amount: offer.displayed_price,  // ← fourni par le client
  delivery_date: deliveryDate.toISOString().split('T')[0],
});
```

La policy RLS d'insertion sur `orders` (`orders_insert_mechanic`) vérifie seulement
`auth.uid() = mechanic_id` — rien ne relie `offer_id` à une demande appartenant à ce mécanicien, rien ne
vérifie que `supplier_id` correspond réellement au fournisseur de l'offre, et rien ne recalcule
`cash_amount` côté serveur.

**Risque métier concret :** paiement **cash à la livraison**. Un mécanicien malveillant (ou simplement un
appel API forgé, sans même toucher à l'UI) peut envoyer `cash_amount: 1` au lieu du vrai prix affiché — le
livreur collecte 1 DA à la livraison pendant que le fournisseur croit être payé sur la base de son
`net_price` réel. Le calcul de commission fait par l'admin (`cash_amount - net_price`,
`src/pages/AdminDashboard.tsx:1005`) devient négatif ou faux, et les réversements aux fournisseurs sont
basés sur des montants qui n'ont jamais été réellement collectés. La date de livraison (règle "cutoff
12h") est elle aussi calculée sur l'horloge du navigateur du client, donc falsifiable.

**Correctif proposé** — remplacer les 4 appels client (`insert order`, `update offer selected`,
`update offers rejected`, `update request`) par une seule fonction RPC atomique, `SECURITY DEFINER`, qui
recalcule tout côté serveur :

```sql
CREATE OR REPLACE FUNCTION select_offer(p_offer_id uuid)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer offers%ROWTYPE;
  v_request requests%ROWTYPE;
  v_now timestamptz := now();
  v_algiers_hour int;
  v_delivery_date date;
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offre introuvable';
  END IF;
  IF v_offer.status <> 'active' THEN
    RAISE EXCEPTION 'Cette offre n''est plus active';
  END IF;

  SELECT * INTO v_request FROM requests WHERE id = v_offer.request_id;
  IF v_request.mechanic_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cette demande ne vous appartient pas';
  END IF;
  IF v_request.status <> 'open' THEN
    RAISE EXCEPTION 'Cette demande n''est plus ouverte';
  END IF;

  -- Algérie = UTC+1 fixe, pas d'heure d'été
  v_algiers_hour := EXTRACT(HOUR FROM (v_now AT TIME ZONE 'UTC' + interval '1 hour'));
  v_delivery_date := (v_now AT TIME ZONE 'UTC' + interval '1 hour')::date;
  IF v_algiers_hour >= 12 THEN
    v_delivery_date := v_delivery_date + 1;
  END IF;
  WHILE EXTRACT(DOW FROM v_delivery_date) IN (5, 6) LOOP  -- Ven=5, Sam=6
    v_delivery_date := v_delivery_date + 1;
  END LOOP;

  INSERT INTO orders (offer_id, mechanic_id, supplier_id, cash_amount, selected_at, delivery_date)
  VALUES (v_offer.id, auth.uid(), v_offer.supplier_id, v_offer.displayed_price, v_now, v_delivery_date)
  RETURNING * INTO v_order;

  UPDATE offers SET status = 'selected', updated_at = v_now WHERE id = v_offer.id;
  UPDATE offers SET status = 'rejected', updated_at = v_now
    WHERE request_id = v_request.id AND id <> v_offer.id AND status = 'active';
  UPDATE requests SET status = 'offer_selected' WHERE id = v_request.id;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION select_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION select_offer(uuid) TO authenticated;

-- Les clients ne doivent plus pouvoir insérer/mettre à jour ces tables directement
-- pour ce flux : on retire la policy d'insertion directe sur orders.
DROP POLICY IF EXISTS "orders_insert_mechanic" ON orders;
```

Frontend (`src/pages/MechanicDashboard.tsx:291-329`) :

```diff
  const handleSelectOffer = async (offer: OfferWithDetails) => {
    if (!profile || !selectedRequest) return;
    setActionError('');
    setActionLoading(true);
    try {
-     const selectedAt = new Date();
-     const deliveryDate = computeDeliveryDate(selectedAt);
-
-     const { error: orderError } = await supabase
-       .from('orders')
-       .insert({
-         offer_id: offer.id,
-         mechanic_id: profile.id,
-         supplier_id: offer.supplier_id,
-         cash_amount: offer.displayed_price,
-         delivery_date: deliveryDate.toISOString().split('T')[0],
-       })
-       .select('*')
-       .single();
-     if (orderError) throw orderError;
-
-     const { error: offerErr } = await supabase
-       .from('offers')
-       .update({ status: 'selected' })
-       .eq('id', offer.id);
-     if (offerErr) throw offerErr;
-
-     await supabase
-       .from('offers')
-       .update({ status: 'rejected' })
-       .neq('id', offer.id)
-       .eq('request_id', selectedRequest.id);
-
-     await supabase
-       .from('requests')
-       .update({ status: 'offer_selected' })
-       .eq('id', selectedRequest.id);
+     const { error: rpcError } = await supabase.rpc('select_offer', { p_offer_id: offer.id });
+     if (rpcError) throw rpcError;
```

`computeDeliveryDate`/`formatDeliveryDate` dans `src/lib/delivery.ts` peuvent rester pour l'affichage
prévisionnel ("livraison estimée le...") avant confirmation, tant que la valeur réellement stockée vient
du RPC.

---

## 🟠 ÉLEVÉ

### 4. Policies Storage non scopées au propriétaire

**Fichiers :** les 3 migrations de buckets (voir #2).

```sql
CREATE POLICY "carte_grise_upload_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'carte-grise');
CREATE POLICY "carte_grise_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'carte-grise');
```

Malgré leur nom (`_own`), ces policies ne vérifient **aucun lien de propriété** — juste le bucket. N'importe
quel utilisateur authentifié (mécanicien, fournisseur, livreur) peut supprimer ou écraser (avec
`upsert: true` d'un futur commit) le fichier d'un autre utilisateur dans les 3 buckets.

**Risque métier concret :** un fournisseur mécontent pourrait supprimer la carte grise d'un mécanicien
concurrent-adjacent, ou l'audio d'une demande, cassant sa capacité à faire traiter sa demande.

**Correctif proposé (lié à l'étape 2 du finding #2)** — nécessite de préfixer les chemins par l'id du
propriétaire au moment de l'upload, puis :

```sql
DROP POLICY IF EXISTS "carte_grise_delete_own" ON storage.objects;
CREATE POLICY "carte_grise_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'carte-grise'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- même schéma pour upload_own (WITH CHECK) sur les 3 buckets
```

Je ne l'applique pas seul car il implique aussi de changer `filePath` dans
`src/pages/MechanicDashboard.tsx` (actuellement `` `carte-grise/${fileName}` ``, sans id propriétaire) —
à faire en même temps que le passage en bucket privé (#2) pour éviter deux migrations de données.

---

### 5. Le rôle livreur voit et modifie **toutes** les commandes du système

**Fichier :** `supabase/migrations/20260729205918_fix_profiles_recursion.sql:456-463` (`orders_select_admin_delivery`) et schéma initial (`orders_update_delivery`).

```sql
CREATE POLICY "orders_select_admin_delivery" ON orders FOR SELECT
  TO authenticated USING (
    is_admin() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'delivery')
  );
```

**Il n'existe aucune colonne d'assignation** (`driver_id`/`livreur_id`) sur `orders` — le commentaire du
schéma initial dit "Delivery role sees orders assigned to them" mais cette assignation n'a jamais été
implémentée. Résultat : **tout compte livreur voit et peut marquer "livré" absolument toutes les commandes**
de tous les mécaniciens/fournisseurs, avec leurs adresses (`src/pages/DeliveryDashboard.tsx:182,190`),
montants cash et téléphones.

**Risque métier concret :** avec plusieurs livreurs, chacun voit l'intégralité des adresses d'ateliers et
montants cash de tournées qui ne sont pas les siennes — confidentialité commerciale et sécurité physique
(savoir qui transporte du cash où).

**Correctif proposé** — ceci est un choix produit, pas juste technique : je pars sur un modèle "pool +
claim" (le livreur voit les commandes non affectées et peut se les attribuer ; une fois prise, une commande
n'apparaît que pour lui). **À confirmer avec vous avant implémentation** — l'alternative est une
affectation manuelle par l'admin.

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);

DROP POLICY IF EXISTS "orders_select_admin_delivery" ON orders;
CREATE POLICY "orders_select_pool_or_own_delivery" ON orders FOR SELECT
  TO authenticated USING (
    is_admin()
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'delivery')
      AND (driver_id IS NULL OR driver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "orders_update_delivery" ON orders;
CREATE POLICY "orders_claim_or_update_own_delivery" ON orders FOR UPDATE
  TO authenticated USING (
    is_admin()
    OR (driver_id = auth.uid())
    OR (driver_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'delivery'))
  ) WITH CHECK (
    is_admin() OR driver_id = auth.uid()
  );
```

Il faudra aussi ajouter une policy `SELECT` sur `garage_profiles`/`supplier_profiles` pour le livreur
assigné (actuellement `garage_profiles` n'a **aucune** policy pour le rôle livreur — l'appel
`src/pages/DeliveryDashboard.tsx:39` qui lit l'adresse de l'atelier échoue probablement déjà
silencieusement sous RLS ; ce n'est pas une faille de sécurité, plutôt un bug fonctionnel à corriger en
même temps).

---

### 6. Un mécanicien peut noter un fournisseur sans jamais avoir commandé chez lui

**Fichier :** `supabase/migrations/20260729203742_mecapieces_initial_schema.sql:365-367`

```sql
CREATE POLICY "ratings_insert_own" ON ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);
```

**Risque métier concret :** rien ne vérifie que `order_id`/`target_id` correspondent à une vraie commande
livrée de ce mécanicien chez ce fournisseur. Un mécanicien peut poster un avis 1★ diffamatoire sur
n'importe quel fournisseur (`target_id` arbitraire) en inventant un `order_id` d'une commande qui n'est
pas la sienne — les notes influencent directement la réputation commerciale des fournisseurs sur la
marketplace.

**Correctif proposé :**

```sql
DROP POLICY IF EXISTS "ratings_insert_own" ON ratings;
CREATE POLICY "ratings_insert_own" ON ratings FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = ratings.order_id
        AND o.mechanic_id = auth.uid()
        AND o.supplier_id = ratings.target_id
        AND o.delivery_status = 'delivered'
    )
  );

-- optionnel mais recommandé : empêcher plusieurs notes sur la même commande
ALTER TABLE ratings ADD CONSTRAINT ratings_one_per_order UNIQUE (order_id, author_id);
```

---

### 7. Un fournisseur peut modifier son offre après sélection ou forcer son propre statut

**Fichier :** `supabase/migrations/20260729203742_mecapieces_initial_schema.sql:235-237`

```sql
CREATE POLICY "offers_update_own_supplier" ON offers FOR UPDATE
  TO authenticated USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);
```

**Risque métier concret :** deux problèmes dans cette même policy trop large :
- Un fournisseur peut modifier `net_price` **après** que le mécanicien a choisi son offre (une fois
  `cash_amount` figé côté commande, changer `net_price` fausse le calcul de commission `cash_amount -
  net_price` fait par l'admin pour les réversements).
- Rien n'empêche un fournisseur de faire `update({status: 'selected'})` sur sa propre offre directement,
  sans passer par le choix réel du mécanicien.

**Correctif proposé** — combiné avec le RPC `select_offer` du finding #3, qui est désormais le seul chemin
légitime pour passer une offre à `selected`/`rejected` :

```sql
DROP POLICY IF EXISTS "offers_update_own_supplier" ON offers;
CREATE POLICY "offers_update_own_supplier" ON offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = supplier_id AND status = 'active')
  WITH CHECK (auth.uid() = supplier_id AND status = 'active');
```

Comme `WITH CHECK` revalide sur la ligne **après** modification, ceci bloque de fait tout passage de statut
par le fournisseur lui-même (seule une valeur qui reste `'active'` passe le check), tout en autorisant
l'édition du prix tant que l'offre n'a pas été sélectionnée/rejetée.

---

## 🟡 MOYEN

### 8. CORS `Access-Control-Allow-Origin: *` sur la fonction Edge `admin-users`

**Fichier :** `supabase/functions/admin-users/index.ts:4`

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  ...
};
```

Le risque réel est limité (chaque action reste protégée par la vérification du rôle admin sur le JWT), mais
un wildcard n'a pas de raison d'être sur un endpoint qui gère création/suppression de comptes et
impersonation. Autant restreindre à l'origine de production.

**Correctif proposé :**

```diff
- "Access-Control-Allow-Origin": "*",
+ "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://votre-domaine.vercel.app",
```

---

### 9. Une offre peut être déposée sur une demande déjà fermée

**Fichier :** `supabase/migrations/20260729203742_mecapieces_initial_schema.sql:231-233`

```sql
CREATE POLICY "offers_insert_own_supplier" ON offers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = supplier_id);
```

Rien ne vérifie `requests.status = 'open'`. Un fournisseur qui connaît un `request_id` (par exemple
retrouvé dans son historique après expiration à 12h — voir `expire_unselected_requests_and_offers`) peut
encore poster une nouvelle offre dessus après la clôture du cycle quotidien.

**Correctif proposé :**

```sql
DROP POLICY IF EXISTS "offers_insert_own_supplier" ON offers;
CREATE POLICY "offers_insert_own_supplier" ON offers FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = supplier_id
    AND EXISTS (SELECT 1 FROM requests r WHERE r.id = offers.request_id AND r.status = 'open')
  );
```

---

### 10. Aucun en-tête de sécurité HTTP

**Fichier :** `vercel.json`

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Pas de CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. Impact limité pour une SPA sans
contenu utilisateur exécutable, mais l'absence de `X-Frame-Options`/`frame-ancestors` permet un clickjacking
basique (embarquer l'app dans une iframe invisible), pertinent ici puisque l'app gère mots de passe et
documents d'identité.

**Correctif proposé :**

```diff
 {
   "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
+  ,"headers": [
+    {
+      "source": "/(.*)",
+      "headers": [
+        { "key": "X-Frame-Options", "value": "DENY" },
+        { "key": "X-Content-Type-Options", "value": "nosniff" },
+        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
+        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(self), geolocation=()" },
+        { "key": "Content-Security-Policy", "value": "default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self'" }
+      ]
+    }
+  ]
 }
```

*(la CSP ci-dessus est un point de départ — `camera`/`microphone` sont nécessaires pour l'upload photo/audio ;
à tester avant de merger, une CSP mal calibrée casse l'app plus vite qu'elle ne la protège.)*

---

## 🟢 FAIBLE

### 11. Chemins de fichiers Storage peu aléatoires

**Fichier :** `src/pages/MechanicDashboard.tsx:1188` (et les 2 autres sites d'upload photos)

```js
const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
```

`Math.random()` n'est pas cryptographiquement fort, et combiné à `Date.now()` (public/déductible), le
chemin est en partie devinable. Sans grand impact une fois les buckets privés (#2), mais autant utiliser
`crypto.randomUUID()` déjà disponible nativement dans tous les navigateurs cibles :

```diff
- const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
+ const fileName = `${crypto.randomUUID()}.${fileExt}`;
```

### 12. 18 vulnérabilités npm (devDependencies uniquement)

`npm audit` (tout scope) : **18 vulnérabilités (12 high, 4 moderate, 2 low)**, concentrées dans
`rollup`, `postcss`, `ws`, `yaml` — toutes des dépendances de build (`vite`/tooling), **pas dans le bundle
livré au navigateur**. `npm audit --production` ne remonte que `ws` (haute, uninitialized memory
disclosure / DoS). Risque réel faible (outillage local/CI, pas exposé aux utilisateurs finaux), mais à
nettoyer :

```
npm audit fix
```

À tester après coup (`npm run build` + `npm run typecheck`) car certains correctifs peuvent monter des
majors (rollup 4→ plus récent via la mise à jour de vite).

---

## Ce qui est déjà bien fait (pour ne pas le retoucher par erreur)

- **Aucune clé `service_role` côté client** : elle n'apparaît que dans `supabase/functions/admin-users/index.ts`
  (Deno, côté serveur) et dans `scripts/check-offers.mjs` (script local, lit `process.env`, jamais commité).
  `src/lib/supabase.ts` n'utilise que `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- **`.env` est gitignored** et ne contient que l'URL + la clé anonyme — aucun secret dans l'historique git
  (vérifié : `git log --all -- .env` ne remonte rien).
- **La récursion RLS** (`profiles`↔`profiles`, `requests`↔`offers`) est correctement résolue avec des
  fonctions `SECURITY DEFINER` dédiées (`is_admin()`, `supplier_has_offer_on_request()`).
- **Visibilité des offres concurrentes** : un fournisseur ne voit les offres des autres sur une demande que
  s'il a lui-même une offre dessus (`offers_select_competing_supplier`) — conforme au cahier des charges.
- **`displayed_price`** est une colonne `GENERATED ALWAYS` calculée en base selon la grille de commission
  par palier — impossible à falsifier depuis le client tant qu'on lit cette colonne (voir finding #3 pour
  le vrai trou : c'est au moment de la commande que la valeur n'est plus protégée).
- **L'impersonation admin** est correctement gardée : impossible d'impersonner un autre admin, vérifie
  `is_active`, journalise dans `impersonation_log` via la clé service_role (aucune policy INSERT pour
  `authenticated`, donc un client ne peut pas fabriquer de faux logs), et restaure la session admin via
  `sessionStorage` après coup.
- **Contraintes CHECK en base** déjà en place pour quantité (`quantity > 0`), max 3 photos
  (`array_length(part_photo_urls,1) <= 3`), rôle, statuts — ces règles-là sont bien serveur, pas
  seulement client. Seule la durée max de l'audio (5s) n'est validée que côté client — non exploitable pour
  la sécurité, juste un usage abusif de stockage possible.

---

## Plan d'action suggéré

1. **Finding #1** (trigger anti-escalade profils) — 15 min, aucun impact fonctionnel, à faire en premier.
2. **Finding #2 étape 1** (buckets privés + `createSignedUrl`) — touche 3 fichiers frontend, à tester
   soigneusement (affichage des photos/audio dans les 4 dashboards).
3. **Finding #3** (RPC `select_offer`) — le plus gros chantier, cœur du flux de commande. À tester en
   sandbox avant prod (créer une vraie commande de bout en bout).
4. Findings #6, #7, #9 — policies isolées, faible risque de régression, peuvent suivre rapidement.
5. Finding #5 (scoping livreur) — nécessite votre validation sur le modèle métier (pool auto-assigné vs
   assignation admin) avant que je propose le code frontend correspondant.
6. Findings #4, #8, #10, #11, #12 — à faire quand vous voulez, aucun n'est bloquant.

Dites-moi lesquels valider et je les applique un par un.
