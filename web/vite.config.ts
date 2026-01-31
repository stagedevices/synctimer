import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(rootDir, 'public')
const pressDir = path.join(publicDir, 'press')

const pressAssetExists = (fileName: string) =>
  fs.existsSync(path.join(pressDir, fileName))

const listPressAssets = (subdir: string, extensions: string[]) => {
  const dir = path.join(pressDir, subdir)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((file) => extensions.includes(path.extname(file).toLowerCase()))
    .map((file) => `/press/${subdir}/${file}`)
}

const pressAssetManifest = {
  downloads: {
    presskitComplete: pressAssetExists('presskit-complete.zip'),
    logos: pressAssetExists('logos.zip'),
    screenshots: pressAssetExists('screenshots.zip'),
    video: pressAssetExists('video.zip'),
    brandGuidelines: pressAssetExists('brand-guidelines.pdf'),
  },
  logos: listPressAssets('logos', ['.png', '.jpg', '.jpeg', '.svg', '.webp']),
  screenshots: listPressAssets('screenshots', ['.png', '.jpg', '.jpeg', '.webp']),
  videos: listPressAssets('video', ['.mp4', '.mov', '.webm']),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __PRESS_ASSET_MANIFEST__: JSON.stringify(pressAssetManifest),
  },
})
