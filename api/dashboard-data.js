const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });
  try { jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid session' }); }

  const { date_from, date_to, fpt_source, domein } = req.query;

  let q = supabase.from('pazzox_order_summary').select('*');
  if (date_from) q = q.gte('order_date', date_from);
  if (date_to)   q = q.lte('order_date', date_to);
  if (fpt_source && fpt_source !== 'all') q = q.eq('fpt_source', fpt_source);
  if (domein     && domein     !== 'all') q = q.eq('domein', domein);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const orders = data || [];
  const num = v => parseFloat(v) || 0;
  const sum = (arr, fn) => arr.reduce((s, r) => s + fn(r), 0);

  const total = orders.length;
  const totalRevenue     = sum(orders, r => num(r.revenue));
  const totalGrossProfit = sum(orders, r => num(r.gross_profit));
  const totalShipping    = sum(orders, r => num(r.shipping_cost));
  const totalMarketing   = sum(orders, r => num(r.marketing_cost));
  const totalVoucher     = sum(orders, r => num(r.voucher_cost));
  const totalProfit      = sum(orders, r => num(r.profit));

  const newOrders      = orders.filter(r => r.retention_tag === 'visitor');
  const existingOrders = orders.filter(r => r.retention_tag !== 'visitor');
  const beOrders       = orders.filter(r => r.domein === 'be');
  const nlOrders       = orders.filter(r => r.domein === 'nl');

  // Daily time series
  const dailyMap = {};
  for (const r of orders) {
    const d = r.order_date;
    const dom = r.domein || 'nl';
    if (!dailyMap[d]) dailyMap[d] = { be: [], nl: [] };
    if (dailyMap[d][dom]) dailyMap[d][dom].push(r);
    else dailyMap[d]['nl'].push(r);
  }
  const daily = Object.entries(dailyMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([date, g]) => {
      const beRev = sum(g.be, r => num(r.revenue));
      const nlRev = sum(g.nl, r => num(r.revenue));
      return {
        date,
        be_margin:       beRev ? sum(g.be, r => num(r.gross_profit)) / beRev * 100 : null,
        nl_margin:       nlRev ? sum(g.nl, r => num(r.gross_profit)) / nlRev * 100 : null,
        be_profit_order: g.be.length ? sum(g.be, r => num(r.profit)) / g.be.length : null,
        nl_profit_order: g.nl.length ? sum(g.nl, r => num(r.profit)) / g.nl.length : null,
      };
    });

  // Source breakdown
  const srcMap = {};
  for (const r of orders) {
    const s = r.fpt_source || 'unknown';
    if (!srcMap[s]) srcMap[s] = [];
    srcMap[s].push(r);
  }
  const sources = Object.entries(srcMap)
    .map(([source, rows]) => {
      const rev  = sum(rows, r => num(r.revenue));
      const gp   = sum(rows, r => num(r.gross_profit));
      const ship = sum(rows, r => num(r.shipping_cost));
      const mkt  = sum(rows, r => num(r.marketing_cost));
      const vou  = sum(rows, r => num(r.voucher_cost));
      const prf  = sum(rows, r => num(r.profit));
      const cnt  = rows.length;
      return {
        source, orders: cnt,
        pct:                  total ? cnt / total * 100 : 0,
        revenue:              rev,
        gross_margin_pct:     rev ? gp / rev * 100 : 0,
        gross_profit_order:   cnt ? gp / cnt : 0,
        marketing_cost_order: cnt ? mkt / cnt : 0,
        shipping_cost_order:  cnt ? ship / cnt : 0,
        voucher_cost_order:   cnt ? vou / cnt : 0,
        cost_order:           cnt ? (ship + mkt + vou) / cnt : 0,
        profit_order:         cnt ? prf / cnt : 0,
      };
    })
    .sort((a, b) => b.orders - a.orders);

  const allSources  = [...new Set(orders.map(r => r.fpt_source).filter(Boolean))].sort();
  const allDomeinen = [...new Set(orders.map(r => r.domein).filter(Boolean))].sort();

  res.status(200).json({
    kpis: {
      total_orders: total, avg_revenue: total ? totalRevenue / total : 0,
      gross_margin_pct: totalRevenue ? totalGrossProfit / totalRevenue * 100 : 0,
      avg_gross_profit: total ? totalGrossProfit / total : 0,
      avg_cost: total ? (totalShipping + totalMarketing + totalVoucher) / total : 0,
      avg_profit: total ? totalProfit / total : 0,
      new_orders: newOrders.length,
      existing_orders: existingOrders.length,
      pct_existing: total ? existingOrders.length / total * 100 : 0,
      new_avg_profit: newOrders.length ? sum(newOrders, r => num(r.profit)) / newOrders.length : 0,
      existing_avg_profit: existingOrders.length ? sum(existingOrders, r => num(r.profit)) / existingOrders.length : 0,
      be_orders: beOrders.length, nl_orders: nlOrders.length,
      be_pct: total ? beOrders.length / total * 100 : 0,
      be_avg_profit: beOrders.length ? sum(beOrders, r => num(r.profit)) / beOrders.length : 0,
      nl_avg_profit: nlOrders.length ? sum(nlOrders, r => num(r.profit)) / nlOrders.length : 0,
      total_revenue: totalRevenue, total_gross_profit: totalGrossProfit,
      total_ad_spend: totalMarketing,
    },
    daily, sources,
    filter_options: { sources: allSources, domeinen: allDomeinen },
  });
};
