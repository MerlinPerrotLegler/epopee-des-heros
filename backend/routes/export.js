import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// Get export data (card instances with their layout definitions)
// The actual PDF rendering happens client-side or via puppeteer
router.post('/prepare', (req, res) => {
  const db = getDb();
  const { card_ids, layout_id, card_type, page_width_mm, page_height_mm, bleed_mm, cut_marks } = req.body;

  let instances = [];

  if (card_ids && card_ids.length) {
    const placeholders = card_ids.map(() => '?').join(',');
    instances = db.prepare(`SELECT * FROM card_instances WHERE id IN (${placeholders}) ORDER BY sort_order`).all(...card_ids);
  } else if (layout_id) {
    instances = db.prepare('SELECT * FROM card_instances WHERE layout_id = ? ORDER BY sort_order').all(layout_id);
  } else if (card_type) {
    instances = db.prepare(`
      SELECT ci.* FROM card_instances ci
      JOIN layouts l ON ci.layout_id = l.id
      WHERE l.card_type = ?
      ORDER BY ci.layout_id, ci.sort_order
    `).all(card_type);
  }

  // Fetch layout definitions for each unique layout_id
  const layoutIds = [...new Set(instances.map(i => i.layout_id))];
  const layouts = {};
  for (const lid of layoutIds) {
    const layout = db.prepare('SELECT * FROM layouts WHERE id = ?').get(lid);
    if (layout) {
      layout.definition = JSON.parse(layout.definition);
      // Also fetch back layout if any
      if (layout.back_layout_id) {
        const back = db.prepare('SELECT * FROM layouts WHERE id = ?').get(layout.back_layout_id);
        if (back) back.definition = JSON.parse(back.definition);
        layout.back = back;
      }
      layouts[lid] = layout;
    }
  }

  // Parse instance data
  instances.forEach(i => i.data = JSON.parse(i.data));

  // Fetch components referenced in layouts
  const components = {};
  const allComponents = db.prepare('SELECT * FROM components').all();
  allComponents.forEach(c => {
    c.definition = JSON.parse(c.definition);
    components[c.id] = c;
  });

  res.json({
    instances,
    layouts,
    components,
    exportConfig: {
      page_width_mm: page_width_mm || 210,
      page_height_mm: page_height_mm || 297,
      bleed_mm: bleed_mm || 3,
      cut_marks: cut_marks !== false
    }
  });
});

export default router;
