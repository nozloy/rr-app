import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
	allRaidInstances,
	getKnownRaidByName,
	getKnownRaidBySlug,
	getRaidByName,
	getRaidBySlug,
	legacyRaidInstances,
} from '@/lib/raids'
import { describe, expect, it } from 'vitest'

function getJpegSize(filePath: string) {
	const bytes = readFileSync(filePath)

	if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
		throw new Error(`${filePath} is not a JPEG file.`)
	}

	let offset = 2

	while (offset < bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset += 1
			continue
		}

		const marker = bytes[offset + 1]
		const length = bytes.readUInt16BE(offset + 2)

		if (
			marker >= 0xc0 &&
			marker <= 0xcf &&
			![0xc4, 0xc8, 0xcc].includes(marker)
		) {
			return {
				height: bytes.readUInt16BE(offset + 5),
				width: bytes.readUInt16BE(offset + 7),
			}
		}

		offset += 2 + length
	}

	throw new Error(`${filePath} does not contain JPEG dimensions.`)
}

function getPngSize(filePath: string) {
	const bytes = readFileSync(filePath)
	const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

	for (let index = 0; index < pngSignature.length; index += 1) {
		if (bytes[index] !== pngSignature[index]) {
			throw new Error(`${filePath} is not a PNG file.`)
		}
	}

	if (bytes.toString('ascii', 12, 16) !== 'IHDR') {
		throw new Error(`${filePath} does not contain PNG IHDR chunk.`)
	}

	return {
		height: bytes.readUInt32BE(20),
		width: bytes.readUInt32BE(16),
	}
}

function getImageSize(filePath: string) {
	if (filePath.endsWith('.png')) {
		return getPngSize(filePath)
	}

	if (filePath.endsWith('.jpg')) {
		return getJpegSize(filePath)
	}

	throw new Error(`${filePath} has unsupported extension.`)
}

describe('raids', () => {
	it('finds configured raids by localized and compact names', () => {
		expect(getRaidByName("Марш на Кель'Данас")?.slug).toBe('march-on-queldanas')
		expect(getRaidByName('Провалснов')?.slug).toBe('the-dreamrift')
		expect(getRaidByName('Шпиль Бездны')?.artPath).toBe(
			'/raids/the_voidspire_styled_16x9.png',
		)
		expect(getRaidByName('Споропад')?.slug).toBe('sporefall')
	})

	it('finds configured raids by slug', () => {
		expect(getRaidBySlug('the-dreamrift')?.name).toBe('Провал снов')
	})

	it('finds known legacy raids without treating them as current raids', () => {
		expect(getRaidByName('Icecrown Citadel')).toBeNull()
		expect(getKnownRaidByName('Icecrown Citadel')?.slug).toBe(
			'icecrown-citadel',
		)
		expect(getKnownRaidByName('ICC')?.artPath).toBe(
			'/raids/icecrown_citadel_styled_16x9.jpg',
		)
		expect(getKnownRaidBySlug('firelands')?.name).toBe('Firelands')
	})

	it('keeps the retail raid catalog unique and backed by 16:9 image assets', () => {
		expect(allRaidInstances).toHaveLength(58)
		expect(legacyRaidInstances).toHaveLength(54)
		expect(new Set(allRaidInstances.map(raid => raid.slug)).size).toBe(
			allRaidInstances.length,
		)

		for (const raid of allRaidInstances) {
			expect(raid.aliases.length).toBeGreaterThan(0)

			const assetPath = path.join(process.cwd(), 'public', raid.artPath)
			expect(existsSync(assetPath)).toBe(true)
			expect(raid.artPath).toMatch(/_styled_16x9\.(jpg|png)$/)
			const size = getImageSize(assetPath)
			expect(size.width).toBeGreaterThanOrEqual(1200)
			expect(size.height).toBeGreaterThanOrEqual(675)
			expect(Math.abs(size.width / size.height - 16 / 9)).toBeLessThan(0.002)
		}
	})

	it('keeps every raid tied to a reference image source', () => {
		const sourceManifestPath = path.join(
			process.cwd(),
			'scripts',
			'raid_reference_sources.json',
		)
		const sources = JSON.parse(
			readFileSync(sourceManifestPath, 'utf8'),
		) as Array<{
			slug: string
			pageUrl: string
			imageUrl: string
		}>

		expect(new Set(sources.map(source => source.slug)).size).toBe(
			sources.length,
		)

		for (const raid of allRaidInstances) {
			const source = sources.find(item => item.slug === raid.slug)

			expect(source?.pageUrl).toMatch(/^https:\/\/www\.wowhead\.com\//)
			expect(source?.imageUrl).toMatch(/^https:\/\/wow\.zamimg\.com\//)
			expect(source?.imageUrl).not.toContain('/images/logos/share-icon.png')
		}
	})
})
