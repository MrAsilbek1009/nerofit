# KINETIC — AI Integration (Anthropic)

Companion to `ARCHITECTURE.md`. Covers the two AI features, both powered by the
**Anthropic Claude API** — one provider, two jobs:

1. **AI Coach** — chat that knows the user's data and adjusts their plan.
2. **Food photo → calories** — snap a meal, Claude estimates items + macros.

Claude is multimodal, so the same provider handles text chat *and* image
analysis. No separate vision service.

---

## Model choice (swappable)

| Job | Model | Why |
|---|---|---|
| AI Coach chat | `claude-sonnet-4-6` | Strong reasoning for personalized advice |
| Food photo analysis | `claude-haiku-4-5` | Cheapest + fastest; called frequently |
| (Optional, higher quality) | `claude-opus-4-8` | Use if you want the best output and can pay more |

Model IDs are pinned snapshots. Keep them in one config constant so you can
swap in one place. Latest list: https://platform.claude.com/docs/en/about-claude/models/overview

---

## Golden security rule

The `ANTHROPIC_API_KEY` lives ONLY in Supabase Edge Function secrets:

```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

The mobile app never holds it. The app calls the Edge Function with the user's
Supabase JWT; the function verifies the user, then calls Anthropic. Endpoint is
`https://api.anthropic.com/v1/messages` with headers `x-api-key`,
`anthropic-version: 2023-06-01`, `content-type: application/json`.

---

## 1. Edge Function: `ai-coach` (streaming chat)

`supabase/functions/ai-coach/index.ts`

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );

  // 1. Verify the user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { thread_id, message } = await req.json();

  // 2. Load real context (RLS ensures only this user's rows)
  const [{ data: profile }, { data: goals }, { data: history }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).single(),
    supabase.from('chat_messages').select('role,content')
      .eq('thread_id', thread_id).order('created_at').limit(20),
  ]);

  const system =
    `You are Forge, the user's personal fitness coach. Be concise, supportive, ` +
    `and practical. Use their data to personalize advice. You are not a doctor; ` +
    `for medical concerns, recommend a professional.\n\n` +
    `User: ${profile?.name}. Goal: ${goals?.type}. Equipment: ${goals?.equipment}. ` +
    `Activity: ${goals?.activity_level}. Injuries: ${(goals?.injuries ?? []).join(', ') || 'none'}.`;

  const messages = [
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  // 3. Persist the user message
  await supabase.from('chat_messages').insert({ thread_id, role: 'user', content: message });

  // 4. Call Claude with streaming
  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages, stream: true }),
  });

  // 5. Stream back to the app while accumulating to save the reply
  let full = '';
  const stream = upstream.body!.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'content_block_delta' && evt.delta?.text) full += evt.delta.text;
          } catch { /* keep streaming */ }
        }
      }
      controller.enqueue(chunk);
    },
    async flush() {
      await supabase.from('chat_messages').insert({ thread_id, role: 'assistant', content: full });
    },
  }));

  return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
});
```

The app reads the SSE stream and appends `content_block_delta` text to the
current AI bubble as it arrives.

---

## 2. Edge Function: `food-analysis` (photo → calories)

`supabase/functions/food-analysis/index.ts`

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';

const SYSTEM =
  `You are a nutrition vision assistant. Identify the foods in the image and ` +
  `estimate portion size and macros. If portion is ambiguous, assume a typical ` +
  `serving and lower the confidence. Respond with ONLY valid JSON, no markdown ` +
  `and no prose, matching exactly:\n` +
  `{"items":[{"name":"","portion":"","kcal":0,"protein_g":0,"carbs_g":0,"fats_g":0}],` +
  `"total":{"kcal":0,"protein_g":0,"carbs_g":0,"fats_g":0},` +
  `"confidence":"high|medium|low","notes":""}`;

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // App sends a resized (<2MP) base64 JPEG/PNG
  const { image_base64, media_type } = await req.json();

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type, data: image_base64 } },
          { type: 'text', text: 'Analyze this meal.' },
        ],
      }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? '{}';
  let result;
  try {
    result = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return new Response(JSON.stringify({ error: 'parse_failed', raw }), { status: 502 });
  }

  // Optional: keep a record (user can still edit before logging)
  await supabase.from('food_scans').insert({ user_id: user.id, result });

  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
});
```

**Important:** results are *estimates*, not medical-grade. Always show them in an
editable form so the user can fix the portion or numbers before logging. Show
the `confidence` value so they know when to double-check.

---

## 3. Data model additions

Add to the nutrition section of `ARCHITECTURE.md`:

- **Storage bucket** `food-photos` (private; RLS so a user reads only their own).
- `food_scans` — id, user_id, photo_path (nullable), result (jsonb), created_at.
- On confirm, the user's edited values are written to `meal_logs` (extend it with
  optional `kcal`, `protein_g`, `carbs_g`, `fats_g` for custom/scanned entries,
  and a `source` field = `catalog | scan | manual`).

---

## 4. New screen: "Scan food" (in Nutrition)

Flow, in the Kinetic Editorial style:

```
Nutrition tab
  → "Scan food" button (chartreuse) → Camera / gallery picker
  → Preview photo → "Analyzing…" (call food-analysis)
  → Editable result card: detected items + portions + macros + total,
    with a confidence label; each number is tappable to correct
  → "Add to log" (chartreuse pill) → writes meal_logs, updates Nutrition totals
```

Client steps before upload: resize the image to ~1500px max edge and compress to
JPEG (keeps it under Haiku's ~2 MP sweet spot, lowers latency and cost).

---

## 5. Where this slots into the build plan

- Phase 4 (Nutrition) now also includes the **Scan food** screen + `food-analysis`
  function and `food_scans` table.
- Phase 5 (AI Coach) builds the `ai-coach` function + streaming chat UI.

Both functions share one Anthropic key and the same verify-user pattern, so build
the shared Edge Function scaffolding once.
