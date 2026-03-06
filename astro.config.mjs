import theme from '.'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	integrations: [
		theme({
			site: {
				title: `Rurikov's hack`,
				description: 'CTF and Write up',
				locale: 'zh-CN',
				url: 'https://yangqiuyi.com',
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
