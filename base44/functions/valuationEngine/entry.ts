import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticker, company_name, financials } = await req.json();

    if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 });

    const prompt = `You are an equity analyst. Analyze stock: ${ticker}.
User financials (use your knowledge if empty): ${JSON.stringify(financials || {})}.
Return JSON: company_summary (1-2 sentences), dcf {intrinsic_value, assumptions:{revenue_growth_rate,ebit_margin,terminal_growth_rate,discount_rate}, explanation (1 sentence)}, pe_valuation {fair_value, sector_avg_pe, company_pe, explanation (1 sentence)}, graham_number {value, eps, book_value_per_share, explanation (1 sentence)}, consensus_value, current_price_estimate, upside_pct, classification (A/B/C/D), classification_rationale (1 sentence), risks (3 items), catalysts (3 items), recommendation (Strong Buy/Buy/Hold/Sell/Strong Sell), confidence (1-10). USD values. Be concise.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_4',
      response_json_schema: {
        type: 'object',
        properties: {
          company_summary: { type: 'string' },
          dcf: {
            type: 'object',
            properties: {
              intrinsic_value: { type: 'number' },
              assumptions: { type: 'object' },
              explanation: { type: 'string' }
            }
          },
          pe_valuation: {
            type: 'object',
            properties: {
              fair_value: { type: 'number' },
              sector_avg_pe: { type: 'number' },
              company_pe: { type: 'number' },
              explanation: { type: 'string' }
            }
          },
          graham_number: {
            type: 'object',
            properties: {
              value: { type: 'number' },
              eps: { type: 'number' },
              book_value_per_share: { type: 'number' },
              explanation: { type: 'string' }
            }
          },
          consensus_value: { type: 'number' },
          current_price_estimate: { type: 'number' },
          upside_pct: { type: 'number' },
          classification: { type: 'string' },
          classification_rationale: { type: 'string' },
          risks: { type: 'array', items: { type: 'string' } },
          catalysts: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          confidence: { type: 'number' }
        }
      }
    });

    return Response.json({ valuation: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});