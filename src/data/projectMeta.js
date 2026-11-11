// What the project page shows for a gallery image. Anything you fill in from Admin → Gallery → Details
// replaces these defaults. Defaults are deliberately generic, so edit them for real projects.
import { slugOf } from './services';

export const CATEGORY_TOOLS = {
  design: ['Adobe Photoshop', 'Adobe Illustrator', 'CorelDRAW', 'Adobe InDesign'],
  print: ['Adobe InDesign', 'Adobe Illustrator', 'CorelDRAW', 'Digital & offset printing'],
  signage: ['CorelDRAW', 'Adobe Illustrator', 'ACP, acrylic & LED fabrication', 'Flex & vinyl printing'],
  digital: ['Meta Ads Manager', 'Google Ads', 'Adobe Premiere Pro', 'Amazon Web Services'],
};

const CATEGORY_TEXT = {
  design: 'A design project from our studio. We started from the brief, shared layouts for approval and delivered print-ready and screen-ready files, so the work looks the same everywhere it appears.',
  print: 'A print project handled in-house, from the artwork to the final finishing. We advised on paper, size and finish, checked every proof and delivered on the agreed date.',
  signage: 'A signage project taken from measurement to installation. We designed the layout, chose the right material for the location and budget, fabricated it and fixed it on site.',
  digital: 'A digital project built around the same look as the client’s print and signage, so customers see one consistent brand online and offline.',
};

const lines = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\n,]/)).map((x) => String(x).trim()).filter(Boolean);

/** Turns a gallery item + the site sessions into everything the project page needs. */
export function projectDetails(item, sessions) {
  const session = sessions.find((s) => s.id === item.category);
  const own = session?.services?.find((sv) => slugOf(sv.name) === slugOf(item.title));
  const services = lines(item.services);
  const tools = lines(item.tools);
  return {
    categoryLabel: session?.label || 'Project',
    accent: session?.accentColor,
    name: (item.client || '').trim() || item.title,
    hasClient: !!(item.client || '').trim(),
    paragraphs: String(item.description || '').trim()
      ? String(item.description).split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)
      : [CATEGORY_TEXT[item.category] || CATEGORY_TEXT.design],
    services: services.length ? services : [own?.name || session?.label || 'Design'],
    tools: tools.length ? tools : CATEGORY_TOOLS[item.category] || CATEGORY_TOOLS.design,
  };
}
