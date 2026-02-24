import vinext from "vinext";
import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [vinext(), tailwindcss()],
})
