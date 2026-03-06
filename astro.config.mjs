import theme from '.'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://hyperchk.github.io/rurikov',
	base: '/rurikov',
	trailingSlash: "always",

	build: {
		assets: "_astro"
	},

	output: 'static',

	integrations: [
		theme({
			site: {
				title: `Rurikov's hack`,
				description: 'CTF and Write up',
				locale: 'en-US',
				url: 'https://hyperchk.github.io/rurikov',
			},
			author: {
				name: 'Rurivkov',
				email: 'cesaralonso162007@gmail.com',
				signature: 'hack',
				avatar: {
					url: 'https://api.dicebear.com/9.x/rings/svg?seed=Aiden',
					alt: 'Blue',
				},
			},
			links: {
				bilibili: 'bilibili',
				github: 'https://github.com/hyperchk',
			},
			pages: {
				aboutMe: '/about',
			},
		}),
	],
})