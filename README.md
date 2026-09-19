# BeRafiq website

Dark industrial website for BeRafiq / beرفيق.

## Editing
- Main structure/content: `index.html`
- Styling: `styles.css`
- RFQ behaviour: `app.js`
- Supabase connection: `config.js`

## RFQ backend
The front end is ready for a Supabase project. Add the public Supabase Project URL and anon key to `config.js`.

The intended production flow is:
1. Customer uploads CAD/drawing files.
2. Files are stored in a private Supabase bucket named `rfq-files`.
3. RFQ data is stored in a protected `rfqs` table.
4. A Supabase Edge Function called `notify-rfq` emails the BeRafiq owner and sends the customer a confirmation email.
5. The customer sees an on-screen confirmation with their RFQ reference.

Never place a Supabase service-role key or email API key in browser files.

## GitHub Pages
A Pages deployment workflow is included under `.github/workflows/pages.yml`.
