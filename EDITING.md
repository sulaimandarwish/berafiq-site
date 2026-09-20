# Editing the BeRafiq website

## Fastest way to change wording
1. Open `content.js` in this repository.
2. Click the pencil icon.
3. Change only the text inside quotation marks.
4. Click **Commit changes**.
5. GitHub Pages redeploys automatically.

Most homepage wording now comes from `content.js`.

## Examples
Change:
```js
titleBefore: "From drawing to",
titleEmphasis: "delivered part.",
```

to:
```js
titleBefore: "Saudi manufacturing",
titleEmphasis: "made simpler.",
```

To change the contact email, edit:
```js
email: "hello@berafiq.com"
```

## What not to edit unless you want to change the design
- `styles.css` — visual layout, colors and responsive design
- `app.js` — form behaviour
- `.github/workflows/pages.yml` — GitHub deployment

## Advanced changes
- `index.html` — form fields and page structure
- `styles.css` — design
- `app.js` — interactions
