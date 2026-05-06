import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticker, company_name, financials } = await req.json();

    if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 });

    const prompt = `
You are a professional equity analyst using the RealValueX™ valuation framework.

Analyze the stock: ${ticker} (${company_name || ticker})

User-provided financials (may be empty — use your knowledge if so):
${JSON.stringify(financials || {}, null, 2)}

Perform a comprehensive intrinsic value analysis. Return structured JSON with:

1. company_summary: 2-3 sentence business overview
2. dcf: { intrinsic_value, assumptions: { revenue_growth_rate, ebit_margin, terminal_growth_rate, discount_rate }, explanation }
3. pe_valuation: { fair_value, sector_avg_pe, company_pe, explanation }
4. graham_number: { value, eps, book_value_per_share, explanation }
5. consensus_value: weighted average of the 3 methods
6. current_price_estimate: your best estimate of the current market price
7. upside_pct: ((consensus_value - current_price_estimate) / current_price_estimate * 100)
8. classification: "A" | "B" | "C" | "D"  (A = deep value, B = fair, C = slightly overvalued, D = overvalued)
9. classification_rationale: short explanation
10. risks: array of 3 key risks
11. catalysts: array of 3 key upside catalysts
12. recommendation: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell"
13. confidence: 1-10

All monetary values in USD. Be realistic and data-driven.
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
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