<div align="center"><img style = "width:100%;"src="https://i.imgur.com/lslR2VY.gif"></img></div>
<hr>
<h2 align=center>HeimerBuild</h2>
<h4 align=center>A League of Legends build calculator built with React.JS.</h4>
<br>
<div align=center style="display:flex; justify-content: center; gap:5%">
    <img style = "width:750px;"src="https://i.imgur.com/tkxIZ4f.png">
</div>
<br><hr>

## Portuguese demo video

https://github.com/lemoscaio/heimerbuild/assets/74937642/0db701dd-f5d7-47ce-bb57-3985efaf4bef

## Features

- All champions with updated stats
- Choose a champion and see all base stats of it
- Change the champion level and see the stats update to the chosen level
- Chose up to 6 items and see the additional stats given by them
- Filter the items by champion role
- Create an account and save each build
- Access the user page and see all saved builds

## Motivation
I love how complex League of Legends is, and how every patch the meta can change by simply modifying the AD ratio for a certain character.

Because of this, I always wondered how I could calculate every aspect of a battle, starting from calculating all stats given by items, runes, and level, to how much damage I could do in a combo mixing all of the champion's skills depending on which champion I'm playing against. 

We all know that the current training mode is not good enough. It takes time to start a new training session since it's a real match after all. Not only that but there's no way of changing the runes quickly without creating a new match.

So my goal is to improve this project until I'll be able everything that happens in a battle that I already said and some others. This includes calculating how much time I'll take in a combo after all we know an AD Carrier does not always have the opportunity to just auto-attack the enemy to death depending on the matchup.

## Development

This project uses [Bun](https://bun.com) as package manager and script runner (version pinned in `package.json` under `packageManager`). Install it with `curl -fsSL https://bun.com/install | bash`.

```bash
bun install          # install dependencies (creates node_modules from bun.lock)
bun run dev          # start the Vite dev server
bun run build        # typecheck and build to dist/
bun run preview      # serve the production build locally
bun run typecheck    # tsc --noEmit
bun run test         # run tests with bun test
bun run check        # lint and format check with Biome
bun run check:write  # apply Biome formatting and safe fixes
```

CI (`.github/workflows/ci.yml`) runs `biome ci`, the typecheck, the tests and the build on every pull request and push to `main`.

### Deployment

The app is served by Cloudflare Workers static assets (`wrangler.jsonc`), with SPA fallback for deep links and cache rules in `public/_headers`. Cloudflare Workers Builds deploys `main` to production and uploads a preview version for every other branch, commenting the preview URL on the pull request. Manual equivalents: `bun run deploy` and `bun run preview:upload` (both require `wrangler login`).

Copy `.env.example` to `.env` to point the app at a local API.

## Built with

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![SASS](https://img.shields.io/badge/SASS-hotpink.svg?style=for-the-badge&logo=SASS&logoColor=white)
![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)

## Contact

[![LinkedIn][linkedin-shield]][linkedin-url]


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=blue
[linkedin-url]: https://www.linkedin.com/in/caiodeoliveiralemos/
