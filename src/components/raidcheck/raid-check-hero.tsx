import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { t, type AppLocale } from '@/lib/i18n'
export function RaidCheckHero({ locale }: { locale: AppLocale }) {
	return (
		<section className='raidcheck-hero' aria-labelledby='raidcheck-title'>
			<Image
				src='/home/hero-midnight-citadel.jpg'
				alt=''
				fill
				priority
				sizes='100vw'
				className='raidcheck-hero-bg'
			/>
			<div className='raidcheck-hero-overlay' aria-hidden='true' />

			<div className='raidcheck-hero-content'>
				<div className='raidcheck-hero-copy'>
					<div className='eyebrow'>{t(locale, 'raidcheck.heroEyebrow')}</div>
					<h1 id='raidcheck-title'>{t(locale, 'raidcheck.title')}</h1>
					<p>{t(locale, 'raidcheck.heroCopy')}</p>
				</div>

				<aside
					className='raidcheck-addon-card'
					aria-label={t(locale, 'raidcheck.addonDownloadTitle')}
				>
					<div className='raidcheck-addon-copy'>
						<h2>{t(locale, 'raidcheck.addonDownloadTitle')}</h2>
						<p>{t(locale, 'raidcheck.addonDownloadCopy')}</p>
						<Button asChild className='raidcheck-addon-cta' size='lg'>
							<Link
								href='https://www.curseforge.com/wow/addons/raidreminder'
								rel='noreferrer'
								target='_blank'
							>
								{t(locale, 'raidcheck.downloadAddon')}
								<Image
									src='curseforge.svg'
									alt=''
									height={24}
									width={24}
									priority
									sizes='100vw'
									className='text-white'
								/>
							</Link>
						</Button>
					</div>
				</aside>
			</div>
		</section>
	)
}
