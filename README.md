# جدو داوود — قائمة الطعام الإلكترونية

Arabic RTL mobile-first restaurant menu, built with React + Vite and Vercel Serverless Functions.

## Routes
- / — main menu, hero carousel, categories and contact
- /categories — shareable categories
- /category/<slug>--<id> — individual category
- /product/<slug>--<id> — individual product
- /cart — WhatsApp checkout
- /contact — restaurant address, map and social accounts
- /admin — password-protected restaurant dashboard

## Vercel setup (required for live use)
Connect GitHub repository AliNSheikh/jidodawwud as a Vite project on Vercel, using npm run build and output directory dist. Add these server-side environment variables in Production and Preview:

| Variable | Purpose |
| --- | --- |
| GITHUB_TOKEN | Fine-grained GitHub token with Contents: Read and write for this repository. Never expose to client. |
| GITHUB_REPO_OWNER | AliNSheikh |
| GITHUB_REPO_NAME | jedodawod |
| GITHUB_BRANCH | main |
| ADMIN_PASSWORD | Strong new password of your choice. There is no demo password. |
| SESSION_SECRET | Unpredictable random string at least 32 characters. |
| ORDERS_ENCRYPTION_KEY | Exactly 64 hexadecimal characters (32 random bytes), generate with openssl rand -hex 32. |

Redeploy after adding variables. Never expose these values as VITE_-prefixed variables.

Customer names, phone numbers and addresses are AES-256-GCM encrypted server-side before writing to data/orders.encrypted.json because this repository is public. Keep a secure backup of ORDERS_ENCRYPTION_KEY; losing it makes all stored orders unreadable. Consider changing repository visibility to private for extra safety.

## Admin workflow
1. Visit /admin and sign in using the configured password.
2. Set restaurant WhatsApp with country code, e.g. 9665XXXXXXXX (replace with the real number).
3. Add product categories, upload product photos, set prices and offers, and save to GitHub.
4. Enable delivery and set its fee and free-delivery threshold.
5. Configure Google Maps embed link, social accounts, slides, fonts, logo and favicon.
6. Review order statuses, filter orders, and export the results as an actual XLSX Excel spreadsheet.

Menu data and encrypted orders are read from and written to GitHub. Admin image uploads commit files under public/uploads/ and use GitHub raw links, avoiding waiting for deployment. When Vercel Git integration is enabled, GitHub data commits also trigger site redeployments.

Orders are saved before redirecting to WhatsApp. The system cannot verify that the customer actually presses Send, so restaurant staff should confirm WhatsApp receipt before fulfillment. Visa is recorded as intended payment upon handoff; no online card charge or card details are processed.

## Local development
Install with npm install, then run npx vercel dev for the full frontend and API. npm run dev launches Vite frontend only.

Actual restaurant WhatsApp, street address and menu products were not supplied; these are intentionally left blank rather than fabricated.
