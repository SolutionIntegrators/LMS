// ============================================================================
// BRANDING — the single place to customize this portal for a new client.
// ----------------------------------------------------------------------------
// Everything client-specific that lives in the UI is here. To spin up a new
// client instance, edit this file + the color tokens in app/globals.css
// (:root) + swap the logo/photo assets in /public. Nothing else in the
// component code should need to change for branding.
//
// See SETUP.md for the full clone runbook.
// ============================================================================

export const branding = {
  // ── Identity ────────────────────────────────────────────────────────────
  company: 'Solution Integrators',
  // Browser tab title + meta description
  siteTitle: 'Solution Integrators Portal',
  siteDescription: 'Your learning portal for Solution Integrators programs',
  // Canonical production URL (no trailing slash). Used anywhere a link needs
  // to be stable regardless of which host the request came in on — e.g.
  // affiliate tracking links, which must never bake in a Cloudflare Pages
  // preview domain (*.pages.dev) just because that's what an admin happened
  // to be browsing when they created the link.
  siteUrl: 'https://goodies.solutionintegrators.us',

  // ── Assets (files live in /public) ──────────────────────────────────────
  logo: {
    // Small badge shown in the top nav
    navBadge: '/SI-icon-badge-linen.png',
    // Full logo shown on the login screen
    login: '/SI-primary-logo-orange.png',
  },

  // ── Login screen ────────────────────────────────────────────────────────
  login: {
    tagline: 'Welcome to the Solution Integrators Goodies Shop',
    footnote: 'Access is granted automatically after purchase.',
  },

  // ── Dashboard welcome banner ────────────────────────────────────────────
  welcome: {
    heading: 'Good to have you here! Jump right into your Goodies.',
    subheading: 'Everything you need is in one place. Start wherever makes sense for you.',
    photo: 'https://static.showit.com/file/H7dtw9km6SqQPBR9UEptmQ/154140/9p5a8604.jpg',
    photoBadge: 'Ashley Tindall · Solution Integrators',
    // Bunny/embed iframe URL for the welcome video lightbox (append ?autoplay=true)
    videoEmbedUrl: 'https://iframe.mediadelivery.net/embed/667927/711f2caf-4ce8-40c9-9944-54e18a2ddc88?autoplay=true',
    videoButtonLabel: 'Watch the welcome video',
  },

  // ── Nomenclature ────────────────────────────────────────────────────────
  // What a "product" is called in the student-facing UI (e.g. "Goodie",
  // "Course", "Program"). productOpen is the card CTA.
  productNoun: 'Goodie',
  productOpenLabel: 'Open goodie →',

  // ── Links ───────────────────────────────────────────────────────────────
  links: {
    support: 'https://forms.clickup.com/8619174/f/87156-46214/K4501E0ZLSXXXHF6QA',
    // "Become an affiliate" nav link is shown whenever this is set (any
    // truthy value works as the on/off switch) — it now links to the in-app
    // /affiliate-apply form rather than this URL directly, so the URL itself
    // is unused for navigation. Kept around as a record of the original
    // external application form.
    affiliate: 'https://airtable.com/appCDKeRL8J1xVmuO/pagRazEh4rj7XTsKp/form',
    // Shared invite to the Airtable partner interface, where an affiliate can
    // see all of their tracking links + stats in one place. Referenced from
    // the "your link is ready" email sent on every new link.
    partnerPortal: 'https://airtable.com/invite/l?inviteId=invnIzEeDiGnZDGAd&inviteToken=afb4c008d12f6858041c6d1cd96e5b6668d350be46e55c31a067e21165bc4ec4&utm_medium=email&utm_source=product_team&utm_content=transactional-alerts',
    shop: 'https://solutionintegrators.us/shop',
    shopLabel: 'Want more goodies? Visit the shop →',
    offers: 'https://solutionintegrators.us/service-guide',
    terms: 'https://solutionintegrators.us/digital-product-terms-and-conditions',
    termsLabel: 'Digital Product Terms & Conditions',
  },
} as const

export type Branding = typeof branding
