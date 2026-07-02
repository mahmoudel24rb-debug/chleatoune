// Fonction serverless Vercel : la sauvegarde cloud.
// Stockage : Upstash Redis (intégration Vercel Marketplace, gratuite) —
// les variables UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (ou
// KV_REST_API_URL / KV_REST_API_TOKEN) sont injectées automatiquement
// quand on connecte la base au projet Vercel.
//
// GET  /api/sauvegarde?ping=1      → { ok: true } si le cloud est configuré
// GET  /api/sauvegarde?code=XXXX   → { donnees: "<json>" } ou 404
// POST /api/sauvegarde             → { code, donnees } enregistre la partie

const TAILLE_MAX = 300_000; // ~300 Ko, très large pour une sauvegarde
const CODE_VALIDE = /^[A-Z0-9-]{8,24}$/;

function configRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(commande) {
  const config = configRedis();
  const reponse = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commande),
  });
  if (!reponse.ok) throw new Error(`Redis: ${reponse.status}`);
  return (await reponse.json()).result;
}

export default async function handler(req, res) {
  if (!configRedis()) {
    return res.status(503).json({ erreur: 'Sauvegarde cloud non configurée' });
  }

  if (req.method === 'GET') {
    if (req.query.ping) return res.status(200).json({ ok: true });
    const code = String(req.query.code ?? '').toUpperCase();
    if (!CODE_VALIDE.test(code)) return res.status(400).json({ erreur: 'Code invalide' });
    const donnees = await redis(['GET', `save:${code}`]);
    if (!donnees) return res.status(404).json({ erreur: 'Aucune sauvegarde pour ce code' });
    return res.status(200).json({ donnees });
  }

  if (req.method === 'POST') {
    const { code, donnees } = req.body ?? {};
    const codeNet = String(code ?? '').toUpperCase();
    if (!CODE_VALIDE.test(codeNet)) return res.status(400).json({ erreur: 'Code invalide' });
    if (typeof donnees !== 'string' || donnees.length > TAILLE_MAX) {
      return res.status(400).json({ erreur: 'Données invalides' });
    }
    try {
      JSON.parse(donnees); // on ne stocke que du JSON valide
    } catch {
      return res.status(400).json({ erreur: 'JSON invalide' });
    }
    await redis(['SET', `save:${codeNet}`, donnees]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ erreur: 'Méthode non autorisée' });
}
