# Indian Post Pincode Lookup

A React app with six-digit pincode validation, API lookup, a loading indicator, live case-insensitive post office filtering, and visible API/network/empty-result errors.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` for a production build, `npm run preview` to preview it, and `npm test` for the interaction tests.

The lookup calls `https://api.postalpincode.in/pincode/<PINCODE>` directly. An internet connection and browser access to the API are required. Requests time out after 20 seconds.

The supplied Figma file could not be accessed with the connected account. The app uses a responsive black-and-white layout; an exact Figma match is not verified.
