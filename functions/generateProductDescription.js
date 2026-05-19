/**
 * generateProductDescription — admin-only callable
 *
 * Sends a product image URL to Claude Vision and returns a unique,
 * SEO-optimised product description for The PEP Planner shop.
 *
 * Uses the same ANTHROPIC_API_KEY secret already in use by aiResearch.js.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY_pip');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

exports.generateProductDescription = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    // Admin-only
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
    if (!ADMIN_EMAILS.includes(request.auth.token.email?.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { imageUrl, productName, size, category } = request.data;
    if (!imageUrl) throw new HttpsError('invalid-argument', 'imageUrl is required');

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const sizeLabel = size === '7x10' ? '7×10' : size === '5x7' ? '5×7' : size || '';
    const nameHint = productName ? `The product is called "${productName}".` : '';
    const sizeHint = sizeLabel ? `It is available in ${sizeLabel}.` : '';
    const catHint = category === 'accessory' ? 'This is a planner accessory (tabs, bookmark, etc.).' : '';

    const prompt = `You are writing a product description for The PEP Planner shop — a brand that sells physical research planners for people tracking GLP-1 peptide protocols (Semaglutide, Tirzepatide, etc.).

${nameHint} ${sizeHint} ${catHint}

Look at the product image and write a 2–3 sentence product description that:
1. Describes the cover design / colour / aesthetic you can see
2. Mentions the research/tracking purpose naturally (peptide research, injection schedules, GLP-1 protocols, etc.)
3. Uses keywords like: peptide planner, GLP-1 tracker, Semaglutide journal, Tirzepatide log, research planner
4. Sounds warm and brand-consistent, NOT clinical or generic
5. Is unique — do NOT repeat boilerplate across products

Return ONLY the description text, no intro, no quotes, no labels.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const description = response.content?.[0]?.text?.trim() || '';
    if (!description) throw new HttpsError('internal', 'Claude returned an empty response');

    return { description };
  }
);
